package uk.gov.justice.digital.hmpps.cattool.pages

import geb.Page

class CategoriserAwaitingApprovalViewPage extends Page {

  static url = '/form/categoriser/awaitingApprovalView'

  static at = {
    headingText == 'Provisional categorisation'
  }

  static content = {
    headingText { $('h1.govuk-heading-l').text() }

    warning { $('div.govuk-warning-text', 0) }

    backLink { $( 'a.govuk-back-link') }

    categoryDiv { $( '#category-div') }
  }
}
