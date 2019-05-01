const serviceCreator = require('../../server/services/formService')
const Status = require('../../server/utils/statusEnum')

const formClient = {
  getFormDataForUser: jest.fn(),
  update: jest.fn(),
  create: jest.fn(),
  referToSecurity: jest.fn(),
  updateStatus: jest.fn(),
  securityReviewed: jest.fn(),
}
let service

beforeEach(() => {
  service = serviceCreator(formClient)
  formClient.getFormDataForUser.mockReturnValue({ rows: [{ a: 'b' }, { c: 'd' }] })
  formClient.update.mockReturnValue({})
  formClient.create.mockReturnValue({})
  formClient.referToSecurity.mockReturnValue({})
  formClient.updateStatus.mockReturnValue({})
  formClient.securityReviewed.mockReturnValue({})
})

afterEach(() => {
  formClient.getFormDataForUser.mockReset()
  formClient.update.mockReset()
  formClient.create.mockReset()
  formClient.referToSecurity.mockReset()
  formClient.updateStatus.mockReset()
  formClient.securityReviewed.mockReset({})
})

describe('getCategorisationRecord', () => {
  test('it should call query on db', async () => {
    await service.getCategorisationRecord('user1')
    expect(formClient.getFormDataForUser).toBeCalledTimes(1)
  })

  test('it should return the first row', async () => {
    const output = await service.getCategorisationRecord('user1')
    expect(output).toEqual({ a: 'b' })
  })
})

describe('update', () => {
  const baseForm = {
    section1: '',
    section2: '',
    section3: {},
    section4: {
      form1: {},
      form2: { answer: 'answer' },
    },
  }

  describe('When there are no dependant fields', () => {
    const fieldMap = [{ decision: {} }, { followUp1: {} }, { followUp2: {} }]

    const form = {
      ...baseForm,
      section4: {
        ...baseForm.section4,
        form3: {
          decision: '',
          followUp1: '',
          followUp2: '',
        },
      },
    }

    test('should store everything', async () => {
      formClient.getFormDataForUser.mockReturnValue({
        rows: [
          {
            formObject: {
              section1: '',
              section2: '',
              section3: {},
              section4: { form1: {}, form2: { answer: 'answer' } },
            },
          },
          { c: 'd' },
        ],
      })
      const userInput = {
        decision: 'Yes',
        followUp1: 'County',
        followUp2: 'Town',
      }

      const output = await service.update({
        config: { fields: fieldMap },
        userInput,
        formSection: 'section4',
        formName: 'form3',
      })

      expect(output).toEqual({
        ...form,
        section4: {
          ...form.section4,
          form3: {
            decision: 'Yes',
            followUp1: 'County',
            followUp2: 'Town',
          },
        },
      })
    })

    test('should call update', async () => {
      formClient.getFormDataForUser.mockReturnValue({
        rows: [
          {
            id: 'form1',
            ...baseForm,
          },
          { c: 'd' },
        ],
      })

      const userInput = {
        decision: 'Yes',
        followUp1: 'County',
        followUp2: 'Town',
      }

      const output = await service.update({
        bookingId: 1234,
        config: { fields: fieldMap },
        userInput,
        formSection: 'section4',
        formName: 'form3',
      })

      expect(formClient.update).toBeCalledTimes(1)
      expect(formClient.update).toBeCalledWith('form1', output, 1234, 'STARTED', undefined)
    })

    test('should call create and pass in the user', async () => {
      formClient.getFormDataForUser.mockReturnValue({ rows: [] })

      await service.createOrRetrieveCategorisationRecord(1234, 'User', 'LEI', 'OFFno')

      expect(formClient.create).toBeCalledTimes(1)
      expect(formClient.create).toBeCalledWith(1234, 'User', 'STARTED', 'User', 'LEI', 'OFFno')
    })

    test('should reject update if invalid status transition - SECURITY_BACK - APPROVED', async () => {
      formClient.getFormDataForUser.mockReturnValue({
        rows: [
          {
            id: 'form1',
            status: 'SECURITY_BACK',
            ...baseForm,
          },
          { c: 'd' },
        ],
      })

      const userInput = {
        decision: 'Yes',
        followUp1: 'County',
        followUp2: 'Town',
      }

      expect(
        service.update({
          bookingId: 1234,
          config: { fields: fieldMap },
          userInput,
          formSection: 'section4',
          formName: 'form3',
          status: 'APPROVED',
        })
      ).rejects.toEqual(new Error('Invalid state transition from SECURITY_BACK to APPROVED'))
    })

    test('should reject update invalid status transition - APPROVED - STARTED', async () => {
      formClient.getFormDataForUser.mockReturnValue({
        rows: [
          {
            id: 'form1',
            status: 'SECURITY_BACK',
            ...baseForm,
          },
          { c: 'd' },
        ],
      })

      const userInput = {
        decision: 'Yes',
        followUp1: 'County',
        followUp2: 'Town',
      }

      expect(
        service.update({
          bookingId: 1234,
          userId: 'MEEEE',
          config: { fields: fieldMap },
          userInput,
          formSection: 'section4',
          formName: 'form3',
          status: 'APPROVED',
        })
      ).rejects.toEqual(new Error('Invalid state transition from APPROVED to STARTED'))
    })

    it('should add new sections and forms to the licence if they dont exist', async () => {
      formClient.getFormDataForUser.mockReturnValue({
        rows: [
          {
            formObject: {
              ...baseForm,
            },
          },
          { c: 'd' },
        ],
      })
      const userInput = {
        decision: 'Yes',
        followUp1: 'County',
        followUp2: 'Town',
      }

      const output = await service.update({
        userId: 'user1',
        config: { fields: fieldMap },
        userInput,
        formSection: 'section5',
        formName: 'form1',
      })

      const expectedLicence = {
        ...baseForm,
        section5: {
          form1: {
            decision: 'Yes',
            followUp1: 'County',
            followUp2: 'Town',
          },
        },
      }
      expect(output).toEqual(expectedLicence)
    })
  })

  describe('When there are dependant fields', () => {
    const form = {
      ...baseForm,
      section4: {
        ...baseForm.section4,
        form3: {
          decision: '',
          followUp1: '',
          followUp2: '',
        },
      },
    }

    const fieldMap = [
      { decision: {} },
      {
        followUp1: {
          dependentOn: 'decision',
          predicate: 'Yes',
        },
      },
      {
        followUp2: {
          dependentOn: 'decision',
          predicate: 'Yes',
        },
      },
    ]

    test('should store dependents if predicate matches', async () => {
      formClient.getFormDataForUser.mockReturnValue({
        rows: [
          {
            formObject: {
              ...baseForm,
            },
          },
          { c: 'd' },
        ],
      })
      const userInput = {
        decision: 'Yes',
        followUp1: 'County',
        followUp2: 'Town',
      }

      const formSection = 'section4'
      const formName = 'form3'

      const output = await service.update({
        userId: 'user1',
        config: { fields: fieldMap },
        userInput,
        formSection,
        formName,
      })

      expect(output).toEqual({
        ...form,
        section4: {
          ...form.section4,
          form3: {
            decision: 'Yes',
            followUp1: 'County',
            followUp2: 'Town',
          },
        },
      })
    })

    test('should remove dependents if predicate does not match', async () => {
      formClient.getFormDataForUser.mockReturnValue({
        rows: [
          {
            formObject: {
              ...baseForm,
            },
          },
          { c: 'd' },
        ],
      })
      const userInput = {
        decision: 'No',
        followUp1: 'County',
        followUp2: 'Town',
      }

      const formSection = 'section4'
      const formName = 'form3'

      const output = await service.update({
        userId: 'user1',
        config: { fields: fieldMap },
        userInput,
        formSection,
        formName,
      })

      expect(output).toEqual({
        ...form,
        section4: {
          ...form.section4,
          form3: {
            decision: 'No',
          },
        },
      })
    })
  })
})

describe('getValidationErrors', () => {
  const dependantConfig = {
    fields: [
      {
        q1: {
          responseType: 'requiredString',
          validationMessage: 'Please give a full name',
        },
      },
      {
        q2: {
          responseType: 'requiredYesNoIf_q1_Yes',
          validationMessage: 'Error q2',
        },
      },
      {
        q3: {
          responseType: 'requiredString',
          validationMessage: 'Please enter q3 value',
        },
      },
      {
        q4: {
          responseType: 'requiredYesNoIf_q3_Yes',
          validationMessage: 'Error q4',
        },
      },
    ],
  }

  test.each`
    formBody                                   | formConfig         | expectedOutput
    ${{ q1: 'Yes', q3: 'No' }}                 | ${dependantConfig} | ${[{ href: '#q2', text: 'Error q2' }]}
    ${{ q1: 'No', q3: 'No' }}                  | ${dependantConfig} | ${[]}
    ${{ q1: 'No', q3: 'Yes' }}                 | ${dependantConfig} | ${[{ href: '#q4', text: 'Error q4' }]}
    ${{ q1: 'No', q3: 'Yes', q4: 'any text' }} | ${dependantConfig} | ${[{ href: '#q4', text: 'Error q4' }]}
  `('should return errors $expectedContent for form return', ({ formBody, formConfig, expectedOutput }) => {
    expect(service.validate(formBody, formConfig)).toEqual(expectedOutput)
  })
})

describe('validateStatusIfPresent', () => {
  test.each`
    current                          | proposed                         | expectedOutput
    ${Status.STARTED.name}           | ${Status.AWAITING_APPROVAL.name} | ${true}
    ${Status.STARTED.name}           | ${Status.APPROVED.name}          | ${false}
    ${Status.SECURITY_AUTO.name}     | ${Status.SECURITY_BACK.name}     | ${true}
    ${Status.SECURITY_MANUAL.name}   | ${Status.SECURITY_BACK.name}     | ${true}
    ${Status.SECURITY_MANUAL.name}   | ${Status.STARTED.name}           | ${false}
    ${Status.AWAITING_APPROVAL.name} | ${Status.SUPERVISOR_BACK.name}   | ${true}
    ${Status.STARTED.name}           | ${Status.SUPERVISOR_BACK.name}   | ${false}
    ${Status.SUPERVISOR_BACK.name}   | ${Status.AWAITING_APPROVAL.name} | ${true}
    ${Status.SUPERVISOR_BACK.name}   | ${Status.STARTED.name}           | ${false}
    ${undefined}                     | ${Status.APPROVED.name}          | ${false}
    ${undefined}                     | ${Status.AWAITING_APPROVAL.name} | ${false}
    ${undefined}                     | ${Status.SECURITY_MANUAL.name}   | ${false}
    ${undefined}                     | ${Status.SECURITY_AUTO.name}     | ${true}
    ${undefined}                     | ${Status.SECURITY_BACK.name}     | ${false}
    ${undefined}                     | ${Status.STARTED.name}           | ${true}
    ${Status.STARTED.name}           | ${undefined}                     | ${true}
  `(
    `should return $expectedOutput for validate status transition $current to $proposed`,
    ({ current, proposed, expectedOutput }) => {
      expect(service.validateStatus(current, proposed)).toEqual(expectedOutput)
    }
  )
})

describe('computeSuggestedCat', () => {
  const nearMisses = {
    extremismProfile: { provisionalCategorisation: 'C' },
    history: {},
    violenceProfile: { veryHighRiskViolentOffender: false, numberOfSeriousAssaults: 0 },
    ratings: {
      offendingHistory: { furtherChargesCatB: 'No' },
      escapeRating: { escapeCatB: 'No', escapeOtherEvidence: 'Yes' },
      securityBack: { catB: 'No' },
      extremismRating: { previousTerrorismOffences: 'No' },
    },
  }
  test.each`
    data                                                                      | category
    ${{}}                                                                     | ${'C'}
    ${{ details: { dateOfBirth: '2001-03-15' } }}                             | ${'I'}
    ${{ history: { catAType: 'A' } }}                                         | ${'B'}
    ${{ ratings: { securityBack: { catB: 'Yes' } } }}                         | ${'B'}
    ${{ violenceProfile: { veryHighRiskViolentOffender: true } }}             | ${'B'}
    ${{ violenceProfile: { numberOfSeriousAssaults: 1 } }}                    | ${'B'}
    ${{ ratings: { escapeRating: { escapeCatB: 'Yes' } } }}                   | ${'B'}
    ${{ ratings: { furtherCharges: { furtherChargesCatB: 'Yes' } } }}         | ${'B'}
    ${{ ratings: { extremismRating: { previousTerrorismOffences: 'Yes' } } }} | ${'B'}
    ${{ extremismProfile: { provisionalCategorisation: 'B' } }}               | ${'B'}
    ${nearMisses}                                                             | ${'C'}
  `('should return cat $category for data: $data', ({ data, category }) => {
    expect(service.computeSuggestedCat(data)).toEqual(category)
  })
})

const bookingId = 34
const userId = 'MEEE'

describe('referToSecurityIfRiskAssessed', () => {
  const socProfile = { transferToSecurity: true }

  test(' valid status', async () => {
    await service.referToSecurityIfRiskAssessed(bookingId, userId, socProfile, 'STARTED')
    expect(formClient.referToSecurity.mock.calls[0]).toEqual([bookingId, null, Status.SECURITY_AUTO.name])
  })

  test('invalid status', async () => {
    await service.referToSecurityIfRiskAssessed(bookingId, userId, socProfile, 'APPROVED')
    expect(formClient.referToSecurity).not.toBeCalled()
  })

  test('invalid SECURITY_AUTO status', async () => {
    await service.referToSecurityIfRiskAssessed(bookingId, userId, socProfile, 'SECURITY_AUTO')
    expect(formClient.referToSecurity).not.toBeCalled()
  })

  test('database error', async () => {
    formClient.referToSecurity.mockRejectedValue(new Error('TEST'))

    expect(service.referToSecurityIfRiskAssessed(bookingId, userId, socProfile, 'STARTED')).rejects.toThrow('TEST')
  })
})

describe('referToSecurityIfRequested', () => {
  const updatedFormObject = { ratings: { securityInput: { securityInputNeeded: 'Yes' } } }

  test('happy path', async () => {
    formClient.getFormDataForUser.mockReturnValue({ rows: [{ status: 'STARTED' }] })
    const mockTransactionalClient = {}

    await service.referToSecurityIfRequested(bookingId, userId, updatedFormObject, mockTransactionalClient)

    expect(formClient.referToSecurity.mock.calls[0]).toEqual([
      bookingId,
      userId,
      Status.SECURITY_MANUAL.name,
      mockTransactionalClient,
    ])
  })

  test('no record in db', async () => {
    formClient.getFormDataForUser.mockReturnValue({ rows: [] })

    await service.referToSecurityIfRequested(bookingId, userId, updatedFormObject)

    expect(formClient.referToSecurity).not.toBeCalled()
  })

  test('invalid status', async () => {
    formClient.getFormDataForUser.mockReturnValue({ rows: [{ status: 'APPROVED' }] })

    await service.referToSecurityIfRequested(bookingId, userId, updatedFormObject)

    expect(formClient.referToSecurity).not.toBeCalled()
  })

  test('invalid SECURITY_MANUAL status', async () => {
    formClient.getFormDataForUser.mockReturnValue({ rows: [{ status: 'SECURITY_MANUAL' }] })

    await service.referToSecurityIfRequested(bookingId, userId, updatedFormObject)

    expect(formClient.referToSecurity).not.toBeCalled()
  })

  test('database error', async () => {
    formClient.referToSecurity.mockRejectedValue(new Error('TEST'))

    expect(service.referToSecurityIfRequested(bookingId, userId, updatedFormObject)).rejects.toThrow('TEST')
  })
})

describe('securityReviewed', () => {
  test('happy path', async () => {
    formClient.getFormDataForUser.mockReturnValue({ rows: [{ status: 'SECURITY_AUTO' }] })

    await service.securityReviewed(bookingId, userId)

    expect(formClient.securityReviewed.mock.calls[0]).toEqual([bookingId, 'SECURITY_BACK', userId])
  })
})

describe('updateStatus', () => {
  test('happy path', async () => {
    formClient.getFormDataForUser.mockReturnValue({ rows: [{ status: 'AWAITING_APPROVAL' }] })

    await service.backToCategoriser(bookingId)

    expect(formClient.updateStatus.mock.calls[0]).toEqual([bookingId, 'SUPERVISOR_BACK'])
  })

  test('no record in db', async () => {
    formClient.getFormDataForUser.mockReturnValue({ rows: [] })

    await service.backToCategoriser(bookingId)

    expect(formClient.updateStatus).not.toBeCalled()
  })

  test('invalid status', async () => {
    formClient.getFormDataForUser.mockReturnValue({ rows: [{ status: 'STARTED' }] })

    await service.backToCategoriser(bookingId)

    expect(formClient.updateStatus).not.toBeCalled()
  })

  test('invalid SECURITY_BACK status', async () => {
    formClient.getFormDataForUser.mockReturnValue({ rows: [{ status: 'SECURITY_BACK' }] })

    await service.backToCategoriser(bookingId)

    expect(formClient.updateStatus).not.toBeCalled()
  })

  test('database error', async () => {
    formClient.updateStatus.mockRejectedValue(new Error('TEST'))

    expect(service.backToCategoriser(bookingId)).rejects.toThrow('TEST')
  })
})

describe('createOrRetrieveCategorisationRecord', () => {
  test('record exists', async () => {
    formClient.getFormDataForUser.mockReturnValue({ rows: [{ status: 'SECURITY_MANUAL' }] })

    await service.createOrRetrieveCategorisationRecord(bookingId, userId)

    expect(formClient.update).not.toBeCalled()
  })

  test('no record exists', async () => {
    formClient.getFormDataForUser.mockReturnValue({ rows: [] })

    await service.createOrRetrieveCategorisationRecord(bookingId, userId, 'MDI', 'A4567RS')

    expect(formClient.create).toBeCalledWith(bookingId, userId, 'STARTED', userId, 'MDI', 'A4567RS')
  })
})
