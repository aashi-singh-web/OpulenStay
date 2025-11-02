(() => {
  'use strict'

  // Fetch all forms with Bootstrap validation
  const forms = document.querySelectorAll('.needs-validation')

  // Handle form submission
  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
      }

      // Additional validation for textareas
      const textareas = form.querySelectorAll('textarea[required]')
      textareas.forEach(textarea => {
        const value = textarea.value.trim() // Remove whitespace
        if (!value || value.length < 5) {
          textarea.setCustomValidity('Please enter at least 5 characters')
          event.preventDefault()
          event.stopPropagation()
        } else {
          textarea.setCustomValidity('')
        }
      })

      form.classList.add('was-validated')
    }, false)

    // Real-time validation as user types
    const textareas = form.querySelectorAll('textarea[required]')
    textareas.forEach(textarea => {
      textarea.addEventListener('input', () => {
        const value = textarea.value.trim()
        if (!value || value.length < 5) {
          textarea.setCustomValidity('Please enter at least 5 characters')
        } else {
          textarea.setCustomValidity('')
        }
        form.classList.add('was-validated')
      })
    })
  })
})();