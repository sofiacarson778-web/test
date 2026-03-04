// FM Resumes - Main JavaScript

// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('active');
        });
    }

    // Close mobile menu when clicking a link
    const navLinkItems = document.querySelectorAll('.nav-links a');
    navLinkItems.forEach(link => {
        link.addEventListener('click', function() {
            navLinks.classList.remove('active');
        });
    });
});

// Package Price Calculator
function initPackageCalculator() {
    const basePriceEl = document.getElementById('base-price');
    const coverLetterCheckbox = document.getElementById('cover-letter');
    const linkedinCheckbox = document.getElementById('linkedin');
    const totalPriceEl = document.getElementById('total-price');
    const coverLetterRow = document.getElementById('cover-letter-row');
    const linkedinRow = document.getElementById('linkedin-row');

    if (!basePriceEl || !totalPriceEl) return;

    const basePrice = parseInt(basePriceEl.dataset.price);

    function updateTotal() {
        let total = basePrice;
        
        if (coverLetterCheckbox && coverLetterCheckbox.checked) {
            total += 40;
            coverLetterRow.style.display = 'flex';
        } else if (coverLetterRow) {
            coverLetterRow.style.display = 'none';
        }

        if (linkedinCheckbox && linkedinCheckbox.checked) {
            total += 60;
            linkedinRow.style.display = 'flex';
        } else if (linkedinRow) {
            linkedinRow.style.display = 'none';
        }

        totalPriceEl.textContent = '$' + total;

        // Store selection in sessionStorage
        const selection = {
            basePrice: basePrice,
            coverLetter: coverLetterCheckbox ? coverLetterCheckbox.checked : false,
            linkedin: linkedinCheckbox ? linkedinCheckbox.checked : false,
            total: total,
            packageName: document.querySelector('h1') ? document.querySelector('h1').textContent.replace(' Resume Package', '') + ' Career Package' : 'Resume Package'
        };
        sessionStorage.setItem('packageSelection', JSON.stringify(selection));
    }

    if (coverLetterCheckbox) {
        coverLetterCheckbox.addEventListener('change', updateTotal);
    }
    if (linkedinCheckbox) {
        linkedinCheckbox.addEventListener('change', updateTotal);
    }

    // Initialize
    updateTotal();
}


// Checkout Form
function initCheckout() {
    const checkoutForm = document.getElementById('checkout-form');
    const modal = document.getElementById('success-modal');
    const closeModal = document.getElementById('close-modal');
    const orderRef = document.getElementById('order-ref');
    const selectedPackageInput = document.getElementById('selected-package');
    const selectedAddonsInput = document.getElementById('selected-addons');

    // File upload elements
    const uploadArea = document.getElementById('checkout-upload-area');
    const fileInput = document.getElementById('checkout-resume-upload');
    const fileInfo = document.getElementById('checkout-file-info');
    const fileNameEl = document.getElementById('checkout-file-name');
    const fileSizeEl = document.getElementById('checkout-file-size');

    // File upload handling
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', function() {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            var file = e.dataTransfer.files[0];
            if (file) handleCheckoutFile(file);
        });

        uploadArea.addEventListener('click', function() {
            fileInput.click();
        });

        fileInput.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (file) handleCheckoutFile(file);
        });
    }

    function handleCheckoutFile(file) {
        var allowedTypes = ['application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

        if (!allowedTypes.includes(file.type)) {
            alert('Please upload a PDF, DOC, or DOCX file.');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB.');
            return;
        }

        // Update the file input so the form includes the file
        var dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;

        if (fileNameEl) fileNameEl.textContent = file.name;
        if (fileSizeEl) fileSizeEl.textContent = (file.size / 1024).toFixed(1) + ' KB';
        if (uploadArea) uploadArea.style.display = 'none';
        if (fileInfo) fileInfo.style.display = 'block';
    }

    // Load package selection
    const selection = JSON.parse(sessionStorage.getItem('packageSelection') || '{}');

    // Update summary
    const summaryPackage = document.getElementById('summary-package');
    const summaryBasePrice = document.getElementById('summary-base-price');
    const summaryCoverLetter = document.getElementById('summary-cover-letter');
    const summaryLinkedin = document.getElementById('summary-linkedin');
    const summaryTotal = document.getElementById('summary-total');

    if (summaryPackage && selection.packageName) {
        summaryPackage.textContent = selection.packageName;
    }
    if (summaryBasePrice && selection.basePrice) {
        summaryBasePrice.textContent = '$' + selection.basePrice;
    }
    if (summaryCoverLetter) {
        summaryCoverLetter.textContent = selection.coverLetter ? '$40' : '$0';
        summaryCoverLetter.parentElement.style.display = selection.coverLetter ? 'flex' : 'none';
    }
    if (summaryLinkedin) {
        summaryLinkedin.textContent = selection.linkedin ? '$60' : '$0';
        summaryLinkedin.parentElement.style.display = selection.linkedin ? 'flex' : 'none';
    }
    if (summaryTotal && selection.total) {
        summaryTotal.textContent = '$' + selection.total;
    }

    function getSelectedAddons() {
        const addons = [];
        if (selection.coverLetter) addons.push('Cover Letter');
        if (selection.linkedin) addons.push('LinkedIn Optimization');
        return addons.length ? addons.join(', ') : 'None';
    }

    function updateSelectionFields() {
        if (selectedPackageInput) {
            selectedPackageInput.value = selection.packageName || '';
        }
        if (selectedAddonsInput) {
            selectedAddonsInput.value = getSelectedAddons();
        }
    }

    updateSelectionFields();

    if (checkoutForm) {
        checkoutForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Validate file is uploaded
            if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                alert('Please upload your resume before submitting.');
                return;
            }

            // Generate order reference
            const ref = 'FM-' + Date.now().toString(36).toUpperCase();
            if (orderRef) {
                orderRef.textContent = ref;
            }

            // Submit form data to Netlify Forms
            var formData = new FormData(checkoutForm);
            formData.set('form-name', 'checkout');
            formData.set('order-ref', ref);
            if (selection.packageName) formData.set('package', selection.packageName);
            if (selection.total) formData.set('total', '$' + selection.total);
            updateSelectionFields();
            if (selectedPackageInput) formData.set('selected_package', selectedPackageInput.value);
            if (selectedAddonsInput) formData.set('selected_addons', selectedAddonsInput.value);

            var submitBtn = checkoutForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Submitting...';
            }

            fetch('/', {
                method: 'POST',
                body: formData
            }).then(function(response) {
                if (response.ok) {
                    if (modal) modal.classList.add('active');
                } else {
                    alert('There was an error submitting your order. Please try again.');
                }
            }).catch(function() {
                alert('There was an error submitting your order. Please try again.');
            }).finally(function() {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Submit Order';
                }
            });
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', function() {
            modal.classList.remove('active');
            // Redirect to home
            window.location.href = 'index.html';
        });
    }
}

// Initialize functions based on page
document.addEventListener('DOMContentLoaded', function() {
    initPackageCalculator();
    initCheckout();
});