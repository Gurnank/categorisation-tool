package uk.gov.justice.digital.hmpps.cattool.pages

import geb.Page

class TasklistPage extends Page {

  static String bookingId

  static url = '/tasklist/' + bookingId

  static at = {
    headingText == 'Categorisation task list'
  }

  static content = {
    headingText { $('h1.govuk-heading-l').text() }
    headerBlock { $('div.govuk-grid-column-one-third') }
    headerValue { headerBlock.$('p.govuk-\\!-font-weight-bold') }
    sentenceTableRow1 (required: false){ $('table#sentences tr', 1).find('td')}
    sentenceTableRow2 (required: false){ $('table#sentences tr', 2).find('td')}
    logoutLink { $('a', href: '/logout') }
    startButtons { bodyRows*.$('td', 5)*.find('a') }
    offendingHistoryButton { $('#offendingHistoryButton') }
    furtherChargesButton { $('#furtherChargesButton') }
    securityButton { $('#securityButton') }
    continueButton(required: false) { $('#review a') }
    continueButtonDisabled(required: false) { $('button.govuk-button--disabled') }
    violenceButton { $('#violenceButton') }
    escapeButton { $('#escapeButton') }
    extremismButton { $('#extremismButton') }
    backLink { $('a.govuk-back-link') }
    summarySection(required: true) { $('#review div') }
    openConditionsButton(required: false) { $('#openConditionsButton') }
  }
}
