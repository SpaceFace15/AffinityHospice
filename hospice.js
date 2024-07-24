document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('timesheetForm');
    const previewButton = document.getElementById('previewButton');
    const submitButton = document.getElementById('submitButton');
    submitButton.style.display = 'none'; // Hide the submit button initially

    let daysBetween = [];

    // Function to generate time options for dropdowns
    function generateTimeOptions() {
        const times = [];
        for (let i = 0; i < 24; i++) {
            for (let j = 0; j < 4; j++) {
                const hour = i % 12 === 0 ? 12 : i % 12;
                const period = i < 12 ? 'AM' : 'PM';
                const minute = j * 15;
                const minuteStr = minute === 0 ? '00' : minute.toString();
                times.push(`${hour}:${minuteStr} ${period}`);
            }
        }
        return times;
    }

    const timeOptions = generateTimeOptions();
    document.querySelectorAll('.time-dropdown').forEach(select => {
        timeOptions.forEach(time => {
            const option = document.createElement('option');
            option.value = time;
            option.text = time;
            select.appendChild(option);
        });
    });

    // Function to get all days between two dates
    function getDaysBetween(startDate, endDate) {
        const daysBetween = [];
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            daysBetween.push({
                date: currentDate.toLocaleDateString('en-US', { timeZone: 'America/New_York' }),
                day: currentDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/New_York' })
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return daysBetween;
    }

    // Event listeners for start and end date changes
    document.getElementById('startDate').addEventListener('change', checkDateRange);
    document.getElementById('endDate').addEventListener('change', checkDateRange);

    // Function to parse date strings in YYYY-MM-DD format
    function parseDate(input) {
        const parts = input.split('-');
        return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    // Function to convert time string to decimal hours
    function convertTimeToDecimal(time) {
        const [hour, minutePeriod] = time.split(':');
        const [minute, period] = minutePeriod.split(' ');
        let hours = parseInt(hour);
        const minutes = parseInt(minute);
        if (period === 'PM' && hours !== 12) {
            hours += 12;
        } else if (period === 'AM' && hours === 12) {
            hours = 0;
        }
        return hours + minutes / 60;
    }

    // Function to check the date range and enable relevant inputs
    function checkDateRange() {
        const startDateValue = document.getElementById('startDate').value;
        const endDateValue = document.getElementById('endDate').value;

        if (startDateValue && endDateValue) {
            const startDate = parseDate(startDateValue);
            const endDate = parseDate(endDateValue);

            const dayDifference = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));

            if (endDate < startDate) {
                alert('End date cannot be before start date.');
                document.getElementById('endDate').value = '';
                return;
            } else if (dayDifference > 6) {
                alert('Date range cannot span more than 7 days. Example: Sunday-Saturday is legitimate, Sunday-Sunday is not.');
                document.getElementById('endDate').value = '';
                return;
            }

            daysBetween = getDaysBetween(startDate, endDate);

            const hoursChart = document.getElementById('hoursChart');
            const inputs = hoursChart.querySelectorAll('input, select, textarea');

            // Disable all inputs initially
            inputs.forEach(input => input.disabled = true);

            // Setup the chart with enabled and disabled inputs
            if (endDate >= startDate) {
                hoursChart.style.display = 'block'; // Show the hours chart

                daysBetween.forEach(day => {
                    const dayIndex = new Date(day.date).getDay();
                    inputs.forEach((input) => {
                        const inputDay = input.name.match(/(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/);
                        if (inputDay && dayIndex === ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].indexOf(inputDay[0])) {
                            input.disabled = false; // Enable inputs for the selected days
                        }
                    });
                });

                // Clear values of all inputs that are still disabled
                inputs.forEach(input => {
                    if (input.disabled) {
                        input.value = ''; // Clear value when input is disabled
                    }
                });
            }
        }
    }

    // Function to calculate totals for hours, miles, driving time, services, and patients
    function calculateTotals() {
        let totalHours = 0;
        let totalMinutes = 0;
        let totalMiles = 0;
        let totalDrivingTime = 0;
        let totalServices = 0;
        let totalPatients = 0;
        let allPatientNames = [];

        daysBetween.forEach(day => {
            const dayLower = day.day.toLowerCase();
            const startTime = document.querySelector(`select[name="${dayLower}StartTime"]`).value;
            const endTime = document.querySelector(`select[name="${dayLower}EndTime"]`).value;
            const miles = parseFloat(document.querySelector(`input[name="${dayLower}Miles"]`).value) || 0;
            const drivingTime = parseFloat(document.querySelector(`input[name="${dayLower}DrivingTime"]`).value) || 0;
            const serviceType = document.querySelector(`select[name="${dayLower}ServiceType"]`).value;
            const patientNames = document.querySelector(`textarea[name="${dayLower}PatientNames"]`).value;

            if (startTime && endTime) {
                const startDecimal = convertTimeToDecimal(startTime);
                const endDecimal = convertTimeToDecimal(endTime);
                if (endDecimal > startDecimal) {
                    const totalDecimal = endDecimal - startDecimal;
                    totalHours += Math.floor(totalDecimal);
                    totalMinutes += (totalDecimal - Math.floor(totalDecimal)) * 60;
                }
            }
            if (miles !== 'N/A') totalMiles += miles;
            if (drivingTime !== 'N/A') totalDrivingTime += drivingTime;
            if (serviceType) totalServices += 1;
            if (validatePatientNames(patientNames) && patientNames !== 'N/A') {
                totalPatients += patientNames.split(',').filter(name => name.trim()).length;
                allPatientNames = allPatientNames.concat(patientNames.split(',').filter(name => name.trim()));
            }
        });

        // Convert minutes to hours and minutes format
        totalHours += Math.floor(totalMinutes / 60);
        totalMinutes = totalMinutes % 60;

        document.querySelector('input[name="totalHours"]').value = `${totalHours} hour(s) ${totalMinutes} minute(s)`;
        document.querySelector('input[name="totalMiles"]').value = totalMiles;
        document.querySelector('input[name="totalDrivingTime"]').value = totalDrivingTime;
        document.querySelector('input[name="totalServices"]').value = totalServices;
        document.querySelector('input[name="totalPatients"]').value = totalPatients;

        return allPatientNames;
    }

    // Function to validate patient names using regex
    function validatePatientNames(patientNames) {
        const namePattern = /^[a-zA-Z]+(?:\s[a-zA-Z]+)*$/;
        const names = patientNames.split(',').map(name => name.trim());
        return names.every(name => namePattern.test(name));
    }

    // Function to toggle the visibility of patient names textarea based on service type
    function togglePatientNames() {
        document.querySelectorAll('.service-type').forEach(select => {
            select.addEventListener('change', function () {
                const textarea = this.closest('tr').querySelector('.patient-names');
                if (this.value === 'Client Related') {
                    textarea.style.display = 'block';
                    textarea.value = ''; // Reset the value to an empty string
                    textarea.placeholder = 'Enter patient names here separated by commas';
                    textarea.style.width = `${this.closest('td').offsetWidth - 0.20}px`;
                    textarea.style.height = `${this.closest('td').offsetHeight - 0.20}px`;
                } else {
                    textarea.style.display = 'none';
                    textarea.value = 'N/A'; // Set value to N/A for administrative service
                }
            });
        });
    }

    // Ensure the function is called to attach event listeners
    togglePatientNames();

    // Function to check if all required fields are filled
    function checkComplete() {
        calculateTotals(); // Update totals on every change
        const formData = new FormData(form);
        let allFilled = true;

        daysBetween.forEach(day => {
            const dayLower = day.day.toLowerCase();
            if (!formData.get(`${dayLower}StartTime`) || !formData.get(`${dayLower}EndTime`) || !formData.get(`${dayLower}Miles`) || !formData.get(`${dayLower}DrivingTime`)) {
                allFilled = false;
            }
            const serviceType = formData.get(`${dayLower}ServiceType`);
            if (!serviceType) {
                allFilled = false;
            } else if (serviceType === 'Client Related') {
                const patientNames = formData.get(`${dayLower}PatientNames`).trim();
                if (!patientNames || !validatePatientNames(patientNames)) {
                    allFilled = false;
                }
            }
        });

        // Only checking completeness without setting submit button visibility
        if (formData.get('firstName') && formData.get('lastName') && formData.get('description') && allFilled) {
            // All fields are filled
        } else {
            submitButton.style.display = 'none'; // Hide the submit button if any field is missing
        }
    }

    // Ensure the event listeners for checkComplete are updated after enabling inputs
    document.querySelectorAll('input, select, textarea').forEach(input => input.addEventListener('input', checkComplete));

    // Event listener for preview button
    previewButton.addEventListener('click', function(event) {
        // Ensure patient names are cleared if service type is changed to administrative
        daysBetween.forEach(day => {
            const dayLower = day.day.toLowerCase();
            const serviceType = form.querySelector(`select[name="${dayLower}ServiceType"]`).value;

            if (serviceType !== 'Client Related') {
                form.querySelector(`textarea[name="${dayLower}PatientNames"]`).value = 'N/A';
            }
        });

        // Remove previous preview data if it exists
        const existingPreviewDiv = document.getElementById('previewDataDiv');
        if (existingPreviewDiv) {
            existingPreviewDiv.remove();
        }

        const allPatientNames = calculateTotals(); // Ensure totals are up to date before previewing

        const formData = new FormData(form);

        // Validate fields
        const firstName = formData.get('firstName').trim();
        const lastName = formData.get('lastName').trim();
        const email = formData.get('email').trim();
        const startDate = formData.get('startDate').trim();
        const endDate = formData.get('endDate').trim();
        const description = formData.get('description').trim();

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const datePattern = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD format
        const numberPattern = /^-?\d+(\.\d+)?$/; // Number or decimal

        let valid = true;
        let errorMessage = '';

        if (!firstName) {
            valid = false;
            errorMessage += 'First name is required.\n';
        }

        if (!lastName) {
            valid = false;
            errorMessage += 'Last name is required.\n';
        }

        if (email && !emailPattern.test(email)) {
            valid = false;
            errorMessage += 'Please enter a valid email address.\n';
        }

        if (!email) {
            errorMessage += 'Please enter an email address.\n';
        }

        if (!datePattern.test(startDate)) {
            valid = false;
            errorMessage += 'Start date is invalid.\n';
        }

        if (!datePattern.test(endDate)) {
            valid = false;
            errorMessage += 'End date is invalid.\n';
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        const fieldErrors = new Set();

        daysBetween.forEach(day => {
            const dayLower = day.day.toLowerCase();
            const startTime = formData.get(`${dayLower}StartTime`);
            const endTime = formData.get(`${dayLower}EndTime`);
            const miles = formData.get(`${dayLower}Miles`);
            const drivingTime = formData.get(`${dayLower}DrivingTime`);
            const serviceType = formData.get(`${dayLower}ServiceType`);
            
            let patientNames = '';
            if (serviceType === 'Client Related') {
                patientNames = formData.get(`${dayLower}PatientNames`).trim();
            }

            if (!startTime || !endTime) {
                valid = false;
                fieldErrors.add(`Start time and end time for ${day.day} must be selected.`);
            }
            if (!miles || !numberPattern.test(miles)) {
                valid = false;
                fieldErrors.add(`Miles for ${day.day} must be valid.`);
            }
            if (!drivingTime || !numberPattern.test(drivingTime)) {
                valid = false;
                fieldErrors.add(`Driving time for ${day.day} must be valid.`);
            }
            if (!serviceType) {
                valid = false;
                fieldErrors.add(`Type of service for ${day.day} must be selected.`);
            } else if (serviceType === 'Client Related' && (!patientNames || !validatePatientNames(patientNames))) {
                valid = false;
                fieldErrors.add(`Patient names for ${day.day} must be valid (separated by a comma) and entered if the service type is Client Related.`);
            }
        });

        if (!description) {
            valid = false;
            errorMessage += 'Description is required.\n';
        }

        if (!valid) {
            alert(errorMessage + '\n' + Array.from(fieldErrors).join('\n'));
            console.log(Array.from(fieldErrors)); // Log error messages to diagnose the problem
            return;
        }

        // Create a new div for the preview data
        const previewDataDiv = document.createElement('div');
        previewDataDiv.id = 'previewDataDiv';

        // Build the preview data HTML
        let dataHTML = '<h2>Data to Be Submitted Below</h2>';
        dataHTML += '<p><strong>Volunteer Name:</strong> ' + firstName + ' ' + lastName + '</p>';
        dataHTML += '<p><strong>Email:</strong> ' + email + '</p>';
        dataHTML += '<p><strong>Start Date:</strong> ' + startDate + '</p>';
        dataHTML += '<p><strong>End Date:</strong> ' + endDate + '</p>';
        dataHTML += '<h3>Hours, Miles, and Time Spent Driving Each Day</h3>';
        daysBetween.forEach(day => {
            const startTime = formData.get(`${day.day.toLowerCase()}StartTime`) || 'N/A';
            const endTime = formData.get(`${day.day.toLowerCase()}EndTime`) || 'N/A';
            const miles = formData.get(`${day.day.toLowerCase()}Miles`) || 'N/A';
            const drivingTime = formData.get(`${day.day.toLowerCase()}DrivingTime`) || 'N/A';
            const serviceType = formData.get(`${day.day.toLowerCase()}ServiceType`) || 'N/A';
            const patientNames = formData.get(`${day.day.toLowerCase()}PatientNames`) || 'N/A';
            dataHTML += `<p><strong>${day.day}:</strong> ${startTime} to ${endTime}, ${miles} mile(s), ${drivingTime} minute(s) driving, ${serviceType} service, patient(s): ${patientNames}</p>`;
        });

        const totalHours = document.querySelector('input[name="totalHours"]').value;
        const totalMiles = document.querySelector('input[name="totalMiles"]').value;
        const totalDrivingTime = document.querySelector('input[name="totalDrivingTime"]').value;
        const totalServices = document.querySelector('input[name="totalServices"]').value;
        const totalPatients = document.querySelector('input[name="totalPatients"]').value;

        dataHTML += '<h3>Totals</h3>';
        dataHTML += `<p><strong>Total Hours:</strong> ${totalHours}</p>`;
        dataHTML += `<p><strong>Total Miles:</strong> ${totalMiles} mile(s)</p>`;
        dataHTML += `<p><strong>Total Driving Time:</strong> ${totalDrivingTime} minute(s)</p>`;
        dataHTML += `<p><strong>Total Services:</strong> ${totalServices} service(s)</p>`;
        dataHTML += `<p><strong>Total Patients:</strong> ${totalPatients} patient(s)</p>`;
        dataHTML += `<p><strong>Patient Names:</strong> ${allPatientNames.join(', ')}</p>`;

        // Add description
        dataHTML += '<h3>Description of Activities</h3>';
        dataHTML += '<p>' + description + '</p>';
        dataHTML += '<h4>If this is correct, hit "Submit"</h4>';

        // Insert the preview data HTML into the preview data div
        previewDataDiv.innerHTML = dataHTML;

        // Append the preview data div to the form
        form.appendChild(previewDataDiv);

        // Move the submit button to the bottom of the preview data div
        previewDataDiv.appendChild(submitButton);
        submitButton.style.display = 'block'; // Show the submit button

        // Console log all form data
        console.log("Form Data Preview:", Object.fromEntries(formData.entries()));

        // Reattach event listeners to handle patient names textarea visibility
        togglePatientNames();
    });

    submitButton.addEventListener('click', async function(event) {
        event.preventDefault(); // Prevent the default form submission behavior

        console.log("Submit button clicked");

        // Enable total fields before creating FormData object
        document.querySelector('input[name="totalHours"]').readOnly = false;
        document.querySelector('input[name="totalMiles"]').readOnly = false;
        document.querySelector('input[name="totalDrivingTime"]').readOnly = false;
        document.querySelector('input[name="totalServices"]').readOnly = false;
        document.querySelector('input[name="totalPatients"]').readOnly = false;

        const formData = new FormData(form);

        // Directly add the totals to the form data
        formData.set("totalHours", document.querySelector('input[name="totalHours"]').value);
        formData.set("totalMiles", document.querySelector('input[name="totalMiles"]').value);
        formData.set("totalDrivingTime", document.querySelector('input[name="totalDrivingTime"]').value);
        formData.set("totalServices", document.querySelector('input[name="totalServices"]').value);
        formData.set("totalPatients", document.querySelector('input[name="totalPatients"]').value);

        // Check patient names for each day and set to "N/A" if service type is not "Client Related"
        daysBetween.forEach(day => {
            const dayLower = day.day.toLowerCase();
            const serviceType = form.querySelector(`select[name="${dayLower}ServiceType"]`).value;
            if (serviceType !== 'Client Related') {
                form.querySelector(`textarea[name="${dayLower}PatientNames"]`).value = 'N/A';
            }
        });

        const jsonData = Object.fromEntries(formData.entries());
        console.log("Formdata:", jsonData);

        // Disable total fields after creating FormData object
        document.querySelector('input[name="totalHours"]').readOnly = true;
        document.querySelector('input[name="totalMiles"]').readOnly = true;
        document.querySelector('input[name="totalDrivingTime"]').readOnly = true;
        document.querySelector('input[name="totalServices"]').readOnly = true;
        document.querySelector('input[name="totalPatients"]').readOnly = true;

        console.log(jsonData); // Log the form data to check if totals are included
        const serverurl = 'http://100.29.153.106';

        try {
            // Check if the server is running
            console.log('Checking if the server is running at:', `${serverurl}/health-check`);
            const serverCheckResponse = await fetch(`${serverurl}/health-check`);
            if (!serverCheckResponse.ok) {
                const errorText = await serverCheckResponse.text();
                console.error('Server health check failed:', errorText);
                throw new Error('Server is not running.');
            }
            alert('Server is running. Generating PDF...');

            // Send data to the server to generate PDF
            const submitResponse = await fetch(`${serverurl}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(jsonData)
            });

            if (!submitResponse.ok) {
                const errorText = await submitResponse.text();
                console.error('Failed to generate PDF:', errorText);
                throw new Error('Failed to generate PDF.');
            }

            const submitData = await submitResponse.json();
            alert('PDF generated successfully. Now sending the email.');

            await new Promise(resolve => setTimeout(resolve, 2000));

            // Send email with the generated PDF
            const emailResponse = await fetch(`${serverurl}/send-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fileName: submitData.fileName,
                    email: jsonData.email,
                    firstName: jsonData.firstName,
                    lastName: jsonData.lastName
                })
            });

            if (!emailResponse.ok) {
                const errorText = await emailResponse.text();
                console.error('Failed to send email:', errorText);
                throw new Error('Failed to send email.');
            }

            alert('Email sent successfully.');

            // Open the generated PDF in a new tab
            window.open(`${serverurl}/download/${submitData.fileName}`, '_blank');
        } catch (error) {
            console.error('Error:', error); // Log any error
            alert('Failed to complete the process. Please check the server.');
        }
    });
});

