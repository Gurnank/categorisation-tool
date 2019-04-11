package uk.gov.justice.digital.hmpps.cattool.pages.openConditions

import geb.Page

class ReviewPage extends Page {

  static url = '/form/openConditions/reviewOpenConditions'

  static at = {
    headingText == 'Check your answers before you continue'
  }

  static content = {
    headingText { $('h1.govuk-heading-l').text() }
    form { $('form') }

    submitButton { $('button', type: 'submit') }
    backLink { $('a.govuk-back-link') }

    values { $('dd.govuk-summary-list__value') }
    changeLinks { $('a.govuk-link', text: startsWith('Change')) }

    errorSummaries { $('ul.govuk-error-summary__list li') }
    errors { $('span.govuk-error-message') }
  }
}
