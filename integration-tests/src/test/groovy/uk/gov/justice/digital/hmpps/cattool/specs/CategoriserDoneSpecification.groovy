package uk.gov.justice.digital.hmpps.cattool.specs

import com.github.tomakehurst.wiremock.core.WireMockConfiguration
import com.github.tomakehurst.wiremock.extension.responsetemplating.ResponseTemplateTransformer
import geb.spock.GebReportingSpec
import groovy.json.JsonOutput
import org.junit.Rule
import uk.gov.justice.digital.hmpps.cattool.mockapis.Elite2Api
import uk.gov.justice.digital.hmpps.cattool.mockapis.OauthApi
import uk.gov.justice.digital.hmpps.cattool.model.Caseload
import uk.gov.justice.digital.hmpps.cattool.model.DatabaseUtils
import uk.gov.justice.digital.hmpps.cattool.model.TestFixture
import uk.gov.justice.digital.hmpps.cattool.pages.CategoriserDonePage
import uk.gov.justice.digital.hmpps.cattool.pages.CategoriserHomePage
import uk.gov.justice.digital.hmpps.cattool.pages.CategoriserOffendingHistoryPage
import uk.gov.justice.digital.hmpps.cattool.pages.CategoriserTasklistPage
import uk.gov.justice.digital.hmpps.cattool.pages.SupervisorHomePage

import java.time.LocalDate
import java.time.temporal.ChronoUnit

import static uk.gov.justice.digital.hmpps.cattool.model.UserAccount.*

class CategoriserDoneSpecification extends GebReportingSpec {

  def setup() {
    db.clearDb()
  }

  @Rule
  Elite2Api elite2api = new Elite2Api()

  @Rule
  OauthApi oauthApi = new OauthApi(new WireMockConfiguration()
    .extensions(new ResponseTemplateTransformer(false)))

  TestFixture fixture = new TestFixture(browser, elite2api, oauthApi)
  DatabaseUtils db = new DatabaseUtils()

  def "The done page for a categoriser is present"() {
    when: 'I go to the home page as categoriser'
    db.createData(-1,12, JsonOutput.toJson([
      ratings: [
        offendingHistory: [previousConvictions: "some convictions"],
        securityInput   : [securityInputNeeded: "No"],
        violenceRating  : [highRiskOfViolence: "No", seriousThreat: "Yes"],
        escapeRating    : [escapeFurtherCharges: "Yes"],
        extremismRating : [previousTerrorismOffences: "Yes"]
      ]]))

    db.createData(-2,11, JsonOutput.toJson([
      ratings: [
        offendingHistory: [previousConvictions: "some convictions"],
        securityInput   : [securityInputNeeded: "No"],
        violenceRating  : [highRiskOfViolence: "No", seriousThreat: "Yes"],
        escapeRating    : [escapeFurtherCharges: "Yes"],
        extremismRating : [previousTerrorismOffences: "Yes"]
      ]]))

    def now = LocalDate.now()
    elite2api.stubUncategorised()
    elite2api.stubSentenceData(['B2345XY', 'B2345YZ'], [11, 12], [LocalDate.now().toString(), LocalDate.now().toString()])

    fixture.loginAs(CATEGORISER_USER)


    at CategoriserHomePage

    elite2api.stubCategorised()

    doneTabLink.click()

    then: 'The categoriser done page is displayed'

    at CategoriserDonePage

    prisonNos == ['B2345XY', 'B2345YZ']
    names == ['Scramble, Tim', 'Hemmel, Sarah']

    approvalDates == ['21/02/2019', '20/02/2019']
    categorisers == ['Lamb, John', 'Fan, Jane']
    approvers == ['Helly, James', 'Helly, James']
  }

  def "The done page does not display offenders that haven't been categorised through the Categorisation tool"() {
    when: 'I go to the home page as categoriser'

    def now = LocalDate.now()
    elite2api.stubUncategorised()
    elite2api.stubSentenceData(['B2345XY', 'B2345YZ'], [11, 12], [LocalDate.now().toString(), LocalDate.now().toString()])

    fixture.loginAs(CATEGORISER_USER)

    at CategoriserHomePage

    elite2api.stubCategorised()

    doneTabLink.click()

    then: 'The categoriser done page is displayed without the "PNOMIS" categorised offenders'

    at CategoriserDonePage

    prisonNos == []
    noResultsDiv.isDisplayed()

  }

}
