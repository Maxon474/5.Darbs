const OPENAI_API_KEY = '';

let currentCandidates = [];

// function to change date format
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

async function getRandomPerson() {
    try {
        const response = await fetch('https://randomuser.me/api/?nat=AU,BR,CA,CH,DE,DK,ES,FI,FR,GB,IE,IN,MX,NL,NO,NZ,RS,TR,US');
        const data = await response.json();
        const person = data.results[0];
        return {
            name: `${person.name.last} ${person.name.first}`,
            age: person.dob.age,
            date: person.dob.date,
            gender: person.gender,
            country: person.location.country,
            city: person.location.city,
        };
    } catch (error) {
        console.error('Error getting data:', error);
        return null;
    }
}


function displayPerson(person, container, originalIndex) {
    const personCard = document.createElement('div');
    personCard.className = 'col-md-4 mb-3';
    personCard.id = `candidate-${originalIndex + 1}`;
    personCard.innerHTML = `
        <div class="card h-100">
            <div class="card-body">
                <h5 class="card-title">#${originalIndex + 1} ${person.name}</h5>
                <p class="card-text">
                    <strong>Age:</strong> ${person.age}<br>
                    <strong>Date of Birth:</strong> ${formatDate(person.date)}<br>
                    <strong>Gender:</strong> ${person.gender}<br>
                    <strong>Country:</strong> ${person.country}<br>
                    <strong>City:</strong> ${person.city}<br>
                    <strong>Location:</strong> <a href="https://www.google.lv/maps/place/${encodeURIComponent(person.city)}" target="_blank">View on Google Maps</a>
                </p>
            </div>
        </div>
    `;
    container.appendChild(personCard);
}

function displayAllCandidates() {
    const container = document.getElementById('personalities');
    container.innerHTML = '';
    currentCandidates.forEach((person, index) => displayPerson(person, container, person.originalIndex));
}

async function evaluateCandidates(candidates) {
    const candidatesList = candidates.map((candidate) =>
        `#${candidate.originalIndex + 1} ${candidate.name} (${candidate.age} years, ${candidate.country})`
    ).join('\n');

    const prompt = `Evaluate these candidates for the role of astronaut based on their profiles. Consider factors like age, gender, and country of origin. Provide a detailed analysis and recommend the top 5 candidates. Alo sometimes make funny and unserious reasons for them to be astronauts.Always make only 1 list of candidates.

    Candidates:
    ${candidatesList}

    Please provide your evaluation in English. When mentioning candidates, always include their number (e.g., "Candidate #1" or "Candidate #15").`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        let result = data.choices[0].message.content;

        // add links to candidates in text
        result = result.replace(/#(\d+)/g, (match, number) => {
            return `<a href="#candidate-${number}" class="text-primary">${match}</a>`;
        });

        return result;
    } catch (error) {
        console.error('Error evaluating candidates:', error);
        return 'An error occurred while evaluating candidates. Check the console for details.';
    }
}

// SORT FUNCTIONS AND BUTTONS
function sortByAge() {
    currentCandidates.sort((a, b) => a.age - b.age);
    displayAllCandidates();
}

function sortByName() {
    currentCandidates.sort((a, b) => a.name.localeCompare(b.name));
    displayAllCandidates();
}

function sortByIndex() {
    currentCandidates.sort((a, b) => a.originalIndex - b.originalIndex);
    displayAllCandidates();
}

// Function to update statistics
function updateStatistics() {


    // Find the oldest and youngest candidate
    const oldestCandidate = currentCandidates.reduce((oldest, current) =>
        current.age > oldest.age ? current : oldest
    );
    const youngestCandidate = currentCandidates.reduce((youngest, current) =>
        current.age < youngest.age ? current : youngest
    );

    // Calculate average age
    const averageAge = Math.round(currentCandidates.reduce((sum, candidate) => sum + candidate.age, 0) / currentCandidates.length);

    // Count unique countries
    const countries = {};
    currentCandidates.forEach(candidate => {
        countries[candidate.country] = (countries[candidate.country] || 0) + 1;
    });

    // Search for matching birthdays
    const birthdays = {};
    currentCandidates.forEach(candidate => {
        const birthday = new Date(candidate.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
        if (!birthdays[birthday]) {
            birthdays[birthday] = [];
        }
        birthdays[birthday].push(candidate.name);
    });

    // Update DOM
    document.getElementById('oldestCandidate').textContent = `${oldestCandidate.name} (${oldestCandidate.age} years)`;
    document.getElementById('youngestCandidate').textContent = `${youngestCandidate.name} (${youngestCandidate.age} years)`;
    document.getElementById('averageAge').textContent = `${averageAge} years`;

    const countriesList = document.getElementById('countriesList');
    let html = Object.entries(countries)
        .sort((a, b) => b[1] - a[1])
        .map(([country, count]) => `${country}: ${count} candidates`)
        .join('<br>');

    // Add information about matching birthdays
    const birthdayMatches = Object.entries(birthdays)
        .filter(([date, names]) => names.length > 1)
        .map(([date, names]) => `YAY! ${names.join(' and ')} have the same birthday on ${date}`);

    if (birthdayMatches.length > 0) {
        html += '<br><br><div class="alert alert-success mb-0">';
        html += '<strong>Birthday Matches:</strong><br>';
        html += birthdayMatches.join('<br>');
        html += '</div>';
    }

    countriesList.innerHTML = html;
}

// function to create and download ZIP file
async function downloadCandidatesZip() {
    const zip = new JSZip();
    
    // create JSON file with all candidates
    const candidatesJson = JSON.stringify(currentCandidates, null, 2);
    zip.file("candidates.json", candidatesJson);
    
    // create text file with information about candidates
    let txtContent = "Astronaut Candidates List\n\n";
    currentCandidates.forEach((person, index) => {
        txtContent += `Candidate #${person.originalIndex + 1}\n`;
        txtContent += `Name: ${person.name}\n`;
        txtContent += `Age: ${person.age}\n`;
        txtContent += `Date of Birth: ${formatDate(person.date)}\n`;
        txtContent += `Gender: ${person.gender}\n`;
        txtContent += `Country: ${person.country}\n`;
        txtContent += `City: ${person.city}\n\n`;
    });
    zip.file("candidates.txt", txtContent);


    // ZIP file generation and download
    const content = await zip.generateAsync({type: "blob"});
    saveAs(content, "astronaut_candidates.zip");
}

document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateBtn');
    const evaluateBtn = document.getElementById('evaluateBtn');
    const sortAgeBtn = document.getElementById('sortAgeBtn');
    const sortNameBtn = document.getElementById('sortNameBtn');
    const sortIndexBtn = document.getElementById('sortIndexBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    
    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
            const container = document.getElementById('personalities');
            if (!container) return;

            container.innerHTML = ''; // clear previous results
            document.getElementById('evaluationResult').innerHTML = ''; // clear previous evaluation
            currentCandidates = []; // clear candidates list

            for (let i = 0; i < 30; i++) {
                const person = await getRandomPerson();
                if (person) {
                    person.originalIndex = i; // save original index
                    currentCandidates.push(person);
                }
            }

            displayAllCandidates();
            updateStatistics();

            // button enable
            [evaluateBtn, sortAgeBtn, sortNameBtn, sortIndexBtn, downloadBtn].forEach(btn => {
                if (btn) btn.disabled = false;
            });
        });
    }

    if (sortAgeBtn) {
        sortAgeBtn.addEventListener('click', () => {
            if (currentCandidates.length === 0) return;
            sortByAge();
        });
    }

    if (sortNameBtn) {
        sortNameBtn.addEventListener('click', () => {
            if (currentCandidates.length === 0) return;
            sortByName();
        });
    }

    if (sortIndexBtn) {
        sortIndexBtn.addEventListener('click', () => {
            if (currentCandidates.length === 0) return;
            sortByIndex();
        });
    }

    if (evaluateBtn) {
        evaluateBtn.addEventListener('click', async () => {
            if (currentCandidates.length === 0) return;

            const evaluationResult = document.getElementById('evaluationResult');
            evaluationResult.innerHTML = '<div class="alert alert-info">Evaluating candidates...</div>';

            const result = await evaluateCandidates(currentCandidates);
            evaluationResult.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Evaluation of candidates for the role of astronaut</h5>
                        <p class="card-text">${result.replace(/\n/g, '<br>')}</p>
                    </div>
                </div>
            `;

            evaluationResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (currentCandidates.length === 0) return;
            downloadCandidatesZip();
        });
    }
});
