const hideTablesSchedulingScenes = [
  'knack-scene-render.scene_947', // My CallOuts Calendar view for schedulers
  'knack-scene-render.scene_1023', // Developments page
  'knack-scene-render.scene_981', // VIC Calendar
  'knack-scene-render.scene_982', // NSW Calendar
  'knack-scene-render.scene_983', // QLD Calendar
]

const createCallOutForms = [
  'knack-view-render.view_1437', // #jobs/view-job-details/{id}/add-a-call-out/{id}/, #pages/scene_641/views/view_1437
  'knack-view-render.view_1294', // #jobs/view-job-details/{id}/edit-call-out/{id}/, #pages/scene_576/views/view_1294
  'knack-view-render.view_2126', // #developments/view-development-details/{id}/, #pages/scene_1024/views/view_2126
  'knack-view-render.view_2207', // #upcoming/add-leaveunavailable/, #pages/scene_1057/views/view_2207
]

// Add call out - via My Calendar
// https://lovelight.knack.com/tracker#my-calendar/
// https://builder.knack.com/lovelight/tracker#pages/scene_947/views/view_1962
$(document).on('knack-record-create.view_1962', function(event, view, record) {

  Swal.fire({
    title: "Updating callout...",
    text: "Please wait",
    showConfirmButton: false,
    onBeforeOpen: () => {
      Swal.showLoading()
    },
    onOpen: async () => {
      // Regardless of defaults, ensure the booking is tentative
      record = await updateRecordPromise('object_78', record.id, {
        'field_955': 'Yes',
        'field_1005': 'Tentative'
      })
      await processCallOutChanges(record);
      // Redirect to main edit screen
      window.location.replace(`${event.currentTarget.URL.split('?')[0]}edit-call-out/${record.id}`)
      Swal.close()
    }
  })
})

// Development Create Forms rendered
$(document).on('knack-view-render.view_2254 knack-view-render.view_2258', async function(event, view, data) {
  Knack.showSpinner()
  let development = await getRecordPromise(view.scene.object, view.scene.scene_id)

  let $siteContact = $('#' + view.key + '-field_1025') // Need the jquery wrapper for later manipuation
  let street = document.getElementById('street')
  let street2 = document.getElementById('street2')
  let city = document.getElementById('city')
  let state = document.getElementById('state')
  let zip = document.getElementById('zip')

  //Populate Site Contact
  if (development.field_417_raw) {
    if (development.field_417_raw.length > 0) {
      $siteContact.html(`<option value='${development.field_417_raw[0].id}'>${development.field_417_raw[0].identifier}</option>`).trigger('liszt:updated')
    }
  }
  //Populate Address
  street.value = development.field_199_raw.street
  street2.value = development.field_199_raw.street2 === undefined ? "" : development.field_199_raw.street2 // Only and issue for stree2, only sometimes... ?
  city.value = development.field_199_raw.city
  state.value = development.field_199_raw.state
  zip.value = development.field_199_raw.zip
  Knack.hideSpinner()
})


// Hide empty tables
$(document).on(hideTablesSchedulingScenes.join(' '), function(event, scene) {
  hideEmptyTables(scene)
});

// Create & Edit forms rendered
$(document).on(createCallOutForms.join(' '), function(event, view, data) {
  pimpTimePicker(view.key + '-field_924')
  addJobDetailsToCallOut(view)
})

// ***************************************************************************
// ******************* WHEN A CALL EDIT FORM IS RENDERED *********************
// ***************************************************************************

// Some details for a callout are taken directly from the associated job
// These can be set by record rule, but that doesn't give the user a chance to review them
// This function popualtes the callout record with job details when a form is loaded
function addJobDetailsToCallOut(view) {

  // Gather existing callout fields
  let selectedJob = document.getElementById(view.key + '-field_928')
  let siteContact = $('#' + view.key + '-field_1025') // Need the jquery wrapper for later manipuation
  let street = document.getElementById('street')
  let street2 = document.getElementById('street2')
  let city = document.getElementById('city')
  let state = document.getElementById('state')
  let zip = document.getElementById('zip')

  // Populate job details for new callouts created from a target job
  // This is only relevant when a user first navigates the a job, then adds a callout from that context
  if (view.scene.object === 'object_3') {
    populateSiteContactAndAddress(view.scene.scene_id)
  }

  if (selectedJob) {

    // Populate site and address details if these are blank but there is a job
    if (selectedJob.value.length > 0 && (siteContact[0].value + street.value + street2.value + city.value + state.value + zip.value).length === 0) {
      populateSiteContactAndAddress(selectedJob.value)
    }

    // Store original value
    let originalSelection = selectedJob.value

    // Add a listner for changes in job selection
    $('#' + view.key + '-field_928').on('change', async function() {
      let newSelection = selectedJob.value
      let qtySelections = selectedJob.selectedOptions.length
      if (originalSelection.length === 0 && newSelection.length !== 0 && qtySelections === 1) {
        populateSiteContactAndAddress(newSelection)
      }
      originalSelection = newSelection
    })
  }

  async function populateSiteContactAndAddress(jobId) {
    Knack.showSpinner()
    // Get the job deatils
    let job = await getRecordPromise('object_3', jobId)
    //Populate Site Contact
    if (job.field_432_raw) {
      if (job.field_432_raw.length > 0) {
        siteContact.html(`<option value='${job.field_432_raw[0].id}'>${job.field_432_raw[0].identifier}</option>`).trigger('liszt:updated')
      }
    }
    //Populate Address
    street.value = job.field_12_raw.street
    street2.value = job.field_12_raw.street2 === undefined ? "" : job.field_12_raw.street2 // Only and issue for stree2, only sometimes... ?
    city.value = job.field_12_raw.city
    state.value = job.field_12_raw.state
    zip.value = job.field_12_raw.zip
    Knack.hideSpinner()
  }
}