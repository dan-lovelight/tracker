// Add note to an existing lead
$(document).on('knack-view-render.view_2443', async function(event, view) {

  let leadId = view.scene.scene_id

  preloadAndPimpContactField(view, 'field_1679', async function(){
    let contacts = await getLeadContacts(leadId)
    return contacts
  })

})

// Log a scheduled activity as complete
$(document).on('knack-view-render.view_2482', async function(event, view) {

  let leadId = view.scene.scene_id

  preloadAndPimpContactField(view, 'field_1689', async function(){
    let contacts = await getLeadContacts(leadId)
    return contacts
  })

})

// Add Lead from a contact on the sales My Contacts page
$(document).on('knack-view-render.view_2418', function(event, view) {
  // New submit buttons
  let newSubmitButtons = [{
      "name": "Create",
      "primary": true,
      "callbackBefore": undefined,
      "callbackBeforeArgs": [],
      "submit": true,
      "callbackAfter": redirectToParentPage
    },
    {
      "name": "Create and Add Another",
      "primary": false,
      "callbackBefore": undefined,
      "callbackBeforeArgs": [],
      "submit": true,
      "callbackAfter": false
    }, ,
    {
      "name": "Create and Schedule Activity",
      "primary": false,
      "callbackBefore": checkLeadFields,
      "callbackBeforeArgs": [],
      "submit": false,
      "callbackAfter": createLeadFromContactForm
    }
  ]

  // If required, swap out submit buttons on add activity view
  let $activitiesSubmitButtons = $('#altSubmitActivities')
  if ($activitiesSubmitButtons.length === 0) replaceSubmitButton(view, newSubmitButtons, 'altSubmitActivities')

  // In order to redirect the user to the lead, and show the add activity option, we need to know what the lead was
  // The only way to do this is to insert it using the API. This requires that we intercept the normal submit button
  // And not using the submit button requires that we do our own check that required fields are filled
  function checkLeadFields() {
    rqdFields = ['field_948', 'field_1724', 'field_1705']
    if ($('#kn-input-field_1705 .chzn-select').val() !== '5de04389a297fc00150ee2a0') rqdFields.push('field_986') // Close date required if not cold
    return checkRequiredFields(view, rqdFields) // returns false if check fails
  }

})

//
async function createLeadFromContactForm() {

  let data = {}
  data.field_948 = $('#field_948').val()
  data.field_1724 = [$('#kn-input-field_1724 .chzn-select').val()]
  data.field_1705 = [$('#kn-input-field_1705 .chzn-select').val()]
  data.field_968 = $('#field_968').val()
  data.field_964 = $('#field_964').val()
  data.field_986 = moment($('#view_2418-field_986').datepicker('getDate')).format("DD/MM/YYYY")

  alert('this is not hooked up yet')

}

// Lead details page
$(document).on('knack-scene-render.scene_1118', function(event, scene) {
  formatLeadHeading()
  addZendeskButtonToMenu('view_2436')

  function formatLeadHeading() {
    let $headerView = $('#view_2419')
    let $leadStatus = $('.job-status-wrapper')
    let $leadTeam = $('#view_2447 div.field_962 > div > span')
    // Move the status into the heading
    $headerView.find('.kn-detail-body').append($leadStatus)
    $headerView.find('.kn-detail-body').append($leadTeam)
    $leadTeam.addClass('pull-right').attr("id", "lead-team")
    // Remove the second table column
    $headerView.find('.kn-details-group > div:nth-child(2)').remove()
    // Move the team field into the heading
  }
})

// Schedule or Log an activity from within lead details
$(document).on('knack-view-render.view_2445 knack-view-render.view_2446', async function(event, view) {

  // Add activity option menu
  let activityOptions = [{
    display: '📞 Call',
    return: "Call",
    optionID: "5dde09f0b19ce90016428186"
  }, {
    display: '🤝 Meeting',
    return: "Meeting",
    optionID: "5dde0a04225c5f00151ee8f4"
  }, {
    display: '📧 Email',
    return: "Email",
    optionID: "5dde09fb8f1b080015f60d47"
  }, {
    display: '✅ Task',
    return: "Task",
    optionID: "5dde09f4b5d12c00185236fa"
  }, ]



  // New submit buttons
  let newSubmitButtons = [{
      "name": "Submit",
      "primary": true,
      "callbackBefore": showLeadActivityOptionsDropdown,
      "callbackBeforeArgs": [activityOptions],
      "submit": true,
      "callbackAfter": redirectToParentPage
    },
    {
      "name": "Submit and Book Another",
      "primary": false,
      "callbackBefore": showLeadActivityOptionsDropdown,
      "callbackBeforeArgs": [activityOptions],
      "submit": true,
      "callbackAfter": false
    }
  ]

  // Only submit as dead for logged activities
  if (view.key === 'view_2446') {
    // Logged activities are 'rebooked'
    newSubmitButtons[1].name = "Submit and Rebook"
    // Logged activities allow submit as dead
    newSubmitButtons.push({
      "name": "Submit as Dead",
      "primary": false,
      "callbackBefore": showLeadActivityOptionsDropdown,
      "callbackBeforeArgs": [],
      "submit": true,
      "callbackAfter": markTargetLeadAsDeadAndRedirectToParent
    })
    // The display rules function needs to know this activity is complete
    activityOptions[0].status = 'Complete'
  }

  // Add the activity options menu if it doesn't already exist.
  let $activityOptionsMenu = $('#activityOptionsMenu')
  if ($activityOptionsMenu.length === 0) insertOptionMenu(`#${view.key}`, activityOptions, toggleActivity, 'activityOptionsMenu')

  // If required, swap out submit buttons on add activity view
  let $activitiesSubmitButtons = $('#altSubmitActivities')
  if ($activitiesSubmitButtons.length === 0) replaceSubmitButton(view, newSubmitButtons, 'altSubmitActivities')

  // Format scene display
  toggleActivity(window.activitySelected || 'Call', activityOptions)
  $('#kn-input-field_1688 > div, #kn-input-field_1711 > div').on('click', function() {
    applyActivityDisplayRules(activityOptions[0].status)
  })

  // Preload contacts menu
  let leadId = view.scene.scene_id
  preloadAndPimpContactField(view, 'field_1689', async function(){
    let contacts = await getLeadContacts(leadId)
    return contacts
  })

})

$(document).on('knack-scene-render.scene_1122 knack-view-render.view_2428 knack-view-render.view_2424', async function(event, sceneOrView) {

  // Add activity option menu
  let activityOptions = [{
    display: '📄 Note',
    return: "Note"
  }, {
    display: '📞 Call',
    return: "Call",
    optionID: "5dde09f0b19ce90016428186"
  }, {
    display: '🤝 Meeting',
    return: "Meeting",
    optionID: "5dde0a04225c5f00151ee8f4"
  }, {
    display: '📧 Email',
    return: "Email",
    optionID: "5dde09fb8f1b080015f60d47"
  }, {
    display: '✅ Task',
    return: "Task",
    optionID: "5dde09f4b5d12c00185236fa"
  }, ]

  // New submit buttons
  let newSubmitButtons = [{
      "name": "Submit",
      "primary": true,
      "callbackBefore": showLeadActivityOptionsDropdown,
      "callbackBeforeArgs": [activityOptions],
      "submit": true,
      "callbackAfter": redirectToParentPage
    },
    {
      "name": "Submit and Rebook",
      "primary": false,
      "callbackBefore": showLeadActivityOptionsDropdown,
      "callbackBeforeArgs": [activityOptions],
      "submit": true,
      "callbackAfter": false
    },
    {
      "name": "Submit as Dead",
      "primary": false,
      "callbackBefore": showLeadActivityOptionsDropdown,
      "callbackBeforeArgs": [],
      "submit": true,
      "callbackAfter": markTargetLeadAsDeadAndRedirectToParent
    }
  ]

  // Get all views, approach varies if called by scene or view
  let allViews = sceneOrView.views || sceneOrView.scene.views

  // Add the activity options menu if it doesn't already exist.
  let $activityOptionsMenu = $('#activityOptionsMenu')
  if ($activityOptionsMenu.length === 0) insertOptionMenu('#view_2424', activityOptions, toggleActivity, 'activityOptionsMenu')

  // If required, swap out submit buttons on add note view
  let notesView = allViews.filter(view => view.key === 'view_2424')[0]
  let $notesSubmitButtons = $('#altSubmitNote')
  if ($notesSubmitButtons.length === 0) replaceSubmitButton(notesView, newSubmitButtons, 'altSubmitNote')

  // If required, swap out submit buttons on add activity view
  let activitiesView = allViews.filter(view => view.key === 'view_2428')[0]
  let $activitiesSubmitButtons = $('#altSubmitActivities')
  if ($activitiesSubmitButtons.length === 0) replaceSubmitButton(activitiesView, newSubmitButtons, 'altSubmitActivities')

  // Format scene display
  pimpContactField(activitiesView, 'field_1689')
  pimpContactField(notesView, 'field_1679')
  $("#kn-input-field_1688 > div [value=Cancelled]").parent().remove() // Remove cancelled as a status option
  toggleActivity(window.activitySelected || 'Note')
  $('#kn-input-field_1688 > div, #kn-input-field_1711 > div').on('click', function() {
    applyActivityDisplayRules()
  })

  // Preload contacts menu
  let leadId = view.scene.scene_id
  preloadAndPimpContactField(activitiesView, 'field_1679', async function(){
    let contacts = await getLeadContacts(leadId)
    return contacts
  })
  preloadAndPimpContactField(notesView, 'field_1689', async function(){
    let contacts = await getLeadContacts(leadId)
    return contacts
  })

})

// Notes required
function toggleActivity(activitySelected, optionsArray) {

  let notesViewKey = 'view_2424'
  let $notesView = $(`#${notesViewKey}`)

  let activitiesViewKey = 'view_2428'
  let $activitiesView = $(`#${activitiesViewKey}`)

  // Set global variable to keep track of last option selected
  window.activitySelected = activitySelected

  if (activitySelected === 'Note') {
    $activitiesView.hide()
    $notesView.show()
  } else {
    $activitiesView.show()
    $notesView.hide()
    let activityStatus = optionsArray ? optionsArray.filter(activity => activity.return === activitySelected)[0].status : undefined
    applyActivityDisplayRules(activityStatus)
    // Hide the activity type dropdown
    $('#kn-input-field_1685').hide()

    // Toggle the date field
    if (activitySelected === "Meeting") {
      $('#kn-input-field_1707').hide()
      $('#kn-input-field_1687').show()
      pimpTimePicker({
        key: activitiesViewKey
      }, 'field_1687')
    } else {
      $('#kn-input-field_1707').show()
      $('#kn-input-field_1687').hide()
      pimpTimePicker({
        key: activitiesViewKey
      }, 'field_1707')
    }

  }
}

// activityStatus is optional - no need to pass if this is set explicity on the form.
function applyActivityDisplayRules(activityStatus) {
  let activity = window.activitySelected
  let isComplete = $('input[name$=-field_1688]:checked').val() === 'Complete' || activityStatus === 'Complete'
  let isSuccess = $('input[name$=-field_1711]:checked').val() === 'Success'

  // Show call outcomes if a call
  if (isComplete && activity === 'Call') {
    $('#kn-input-field_1711').show()

    // Hide details unless successful
    if (isSuccess) {
      $('#kn-input-field_1691').show()
    } else {
      $('#kn-input-field_1691').hide()
    }

  } else {
    // Hide call outcomes
    $('#kn-input-field_1711').hide()
    // Show details field
    $('#kn-input-field_1691').show()
  }
}

// ***********************
// Functions for new buttons
function showLeadActivityOptionsDropdown(activityOptions) {

  // Set the activity type in the hidden field
  $('#kn-input-field_1685').show()
  let $activityType = $(`[id^=view_][id$=-field_1685]`)
  let activityDetails = activityOptions.filter(activity => activity.return === activitySelected)[0]
  $activityType.html(`<option value='${activityDetails.optionID}'>${activityDetails.return}</option>`).trigger('liszt:updated')
  if ($activityType[0].value === '' || $activityType[0].value === undefined) throw new Error('activity type not set')
  return true
}

async function markTargetLeadAsDeadAndRedirectToParent() {
  let leadsObj = new KnackObject(objects.leads)
  await leadsObj.update(Knack.hash_id, {
    "field_1705": ['5de043d64546590015b8d4c8']
  })
  window.location.href = Knack.getPreviousScene().link
}

// **************
// Utils
function redirectToParentPage() {
  if (Knack.getPreviousScene().link !== '#') window.location.href = Knack.getPreviousScene().link
}

// Adds display details functionality to a contact field and preloads with contacts passed in
// contactsFunction is a function that returns an array of contacts objects
// By using a function, the field is not loaded until it is clicked, avoiding unnecessary API calls
// Contact objects:
// [{id:id,identifier:identifier}]
function preloadAndPimpContactField(view, field, contactsFunction) {
  // Show contact details after selection
  pimpContactField(view, field)
  // Add listener for when contact field is clicked
  $(`#${view.key}_${field}_chzn input`).on('click', async function() {
    // Check if it has already been populated
    if ($(`#${view.key}-${field} option`).length === 0) {
      // If not, populate the note contacts dropdown with Lead contacts
      try {
        Knack.showSpinner()
        let contacts = await contactsFunction()
        addOptionsToConnectionDropDown(view.key, field, contacts)
      } catch (err) {

      } finally {
        Knack.hideSpinner()
      }
    }
  })
}

// Returns an array of lead contacts
async function getLeadContacts(leadId) {
  let leadsObj = new KnackObject(objects.leads)
  let lead = await leadsObj.get(leadId)
  // Return early if there is no primary contact
  if (!lead.field_1670_raw || lead.field_1670_raw.length === 0) return []
  // Return the primary contact
  let contacts = [{
    id: lead.field_1670_raw[0].id,
    identifier: lead.field_1670_raw[0].identifier
  }]
  // Later update to return any connected contacts
  return contacts
}

// Options is an array or connection objects
// [{id:id,identifier:identifier}]
function addOptionsToConnectionDropDown(view_key, field, options) {
  let $field = $(`#${view_key}-${field}`)
  let optionHTML = ''
  options.forEach(option => {
    optionHTML += `<option value="${option.id}">${option.identifier}</option>`
  })
  $field.html(optionHTML).trigger("liszt:updated")
}

// Takes an array of button objects
// Replaces the standard submit button with buttons defined in this array
// [{
//  name: name,
//  primary: boolean - should the button have the 'is-prmary' class
//  callbackBefore: callback function to execute before submit, will await if async. Always executed, even if submit fails.
// ** if callbackBefore returns false, nothing further will happen **
//  callbackBeforeArgs : array of arguements to pass to the callback
//  submit: boolean - should submit be called after callback function?
//  callbackAfter: callback function to execute after, will await if async
//  callbackAfterArgs : array of arguements to pass to the callback
// }]
function replaceSubmitButton(view, arrayOfButtons, buttonGroupId) {

  // Get the current submit button// Replace the submit button
  let $submitButton = $(`#${view.key} > form > div`)

  // Build HTML for replacement button(s)
  let newButtonHTML = `
<section class="container" id="${buttonGroupId ? buttonGroupId : ''}" style="width:100%">
  ${arrayOfButtons.map((button, index) =>{
    return `<div class="kn-submit" style="display:inline-block">
      <div class="kn-button ${button.primary? 'is-primary' : ''} alt-submit-${index}" style="${index>0 ? 'margin-left:5px': ''}" type="submit" id="alt-submit-${view.key}-${index}">
        ${button.name}
      </div>
    </div>`
  }).join('')}
  </section>`

  // Swap out the submit buttons in the DOM
  $submitButton.after(newButtonHTML).hide()

  // Apply the callback to the click event for each button
  arrayOfButtons.forEach((button, index) => {

    // Get the newly added button
    let $newButton = $(`#alt-submit-${view.key}-${index}`)

    // Add click listner
    $newButton.on('click', async function(event) {
      // Execute before submit callback
      let callbackBeforeSuccess = true
      if (button.callbackBefore) {
        callbackBeforeSuccess = await button.callbackBefore(...button.callbackBeforeArgs || undefined)
      }

      // Submit the form
      if (button.submit && callbackBeforeSuccess) {
        $submitButton.trigger('submit')
      }

      // Execute the after callback
      if (button.callbackAfter && callbackBeforeSuccess) {
        // Wait to ensure the submit has worked
        setTimeout(function() {
          let wait = setInterval(async function() {
            let isLoading = $('.is-loading').length > 0
            let isError = $('.is-error').length > 0
            if (!isLoading) clearInterval(wait)
            if (!isError) {
              if (button.callbackAfterArgs) {
                await button.callbackAfter(...button.callbackAfterArgs)
              } else {
                await button.callbackAfter()
              }
            }
          }, 200)
        }, 1000)
      }

    })

  })

}

// Adds a menu bar at the location indicated by insertBefore paramenter
// Buttons in the menu based on optionsArray:
// [
//  {
//    "display":"buttonText,
//    "return":"value to pass to callback"
//  }
// ]
// onClickFunction takes the return parameter
// function returns the 'return' value specificed in the options array
function insertOptionMenu(insertBefore, optionsArray, onClickCallback, buttonGroupId = "custom-menu") {

  // Don't add the menu twice
  if ($(`#${buttonGroupId}`).length > 0) return

  // Build the HTML for the menu
  let menu = `
  <div class="kn-records-nav" id="${buttonGroupId}" style="margin-bottom:10px">
    <div class="js-filter-menu tabs is-toggle is-flush">
      <ul>
      ${optionsArray.map((button, index) =>{
        let buttonHTML = `<li id="customButton${index}" data-return="${button.return}"`
        if(index===0) buttonHTML += `class="is-active"`
        buttonHTML += `><a><span>${button.display}</span></a></li>`
        return buttonHTML
      }).join('')}
      </ul>
    </div>
  `
  // Add menu to view
  $(menu).insertBefore(insertBefore)

  // Add listeners
  $(`#${buttonGroupId} li`).click(function() {
    $(`#${buttonGroupId} .is-active`).removeClass("is-active")
    $(this).addClass("is-active")
    let returnValue = $(this).attr('data-return')
    onClickCallback(returnValue, optionsArray)
  })

}