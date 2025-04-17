document.getElementById('chemistry-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const reactants = document.getElementById('reactants').value.split(',').map(item => item.trim());
    const products = document.getElementById('products').value.split(',').map(item => item.trim());
    const enthalpyChange = parseFloat(document.getElementById('enthalpy-change').value);

    if (!enthalpyChange || isNaN(enthalpyChange)) {
        alert("Please enter a valid enthalpy change value.");
        return;
    }

    const enthalpyData = generatePotentialEnergyData(reactants, products, enthalpyChange);
    generatePotentialEnergyGraph(enthalpyData);
    displayThermochemicalEquation(reactants, products, enthalpyChange);
});

let chartInstance = null;

function generatePotentialEnergyData(reactants, products, deltaH) {
    const isEndothermic = deltaH > 0;

    const reactantEnergy = [0];
    const activatedComplexEnergy = [Math.abs(deltaH) + 50];
    const productEnergy = isEndothermic ? [deltaH] : [0 - Math.abs(deltaH)];

    return {
        reactants: reactants.join(' + '),
        products: products.join(' + '),
        reactantEnergy: reactantEnergy,
        activatedComplexEnergy: activatedComplexEnergy,
        productEnergy: productEnergy,
        isEndothermic: isEndothermic,
        deltaH: Math.abs(deltaH),
        rawDeltaH: deltaH
    };
}

function generatePotentialEnergyGraph(data) {
    const canvas = document.getElementById('potentialEnergyDiagram');
    const ctx = canvas.getContext('2d');

    const overlayCanvas = document.getElementById('overlayCanvas');
    overlayCanvas.width = canvas.width;
    overlayCanvas.height = canvas.height;

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [data.reactants, 'Activated Complex', data.products],
            datasets: [{
                label: `Enthalpy Diagram (${data.isEndothermic ? 'Endothermic' : 'Exothermic'})`,
                data: [
                    ...data.reactantEnergy,
                    ...data.activatedComplexEnergy,
                    ...data.productEnergy
                ],
                borderColor: data.isEndothermic ? 'blue' : 'green',
                pointBackgroundColor: 'black',
                pointRadius: 5,
                pointHoverRadius: 7,
                borderWidth: 3,
                fill: false,
                tension: 0.4,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function (context) {
                            return `Ep = ${context.raw} kJ`;
                        }
                    }
                },
                legend: {
                    display: true
                },
                annotation: {
                    annotations: {
                        zeroLine: {
                            type: 'line',
                            yMin: 0,
                            yMax: 0,
                            borderColor: 'black',
                            borderWidth: 2,
                            borderDash: [5, 5],
                        }
                    }
                }
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Ep (kJ)',
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Reaction Progress',
                    }
                }
            }
        },
        plugins: [Chart.registry.getPlugin('annotation')],
    });

    setTimeout(() => {
        drawDeltaHArrow(data);
    }, 300);
}

function drawDeltaHArrow(data) {
    const overlayCanvas = document.getElementById('overlayCanvas');
    const ctx = overlayCanvas.getContext('2d');

    if (!chartInstance) return;

    const yScale = chartInstance.scales.y;
    const xScale = chartInstance.scales.x;

    const xMiddle = xScale.getPixelForValue(1); // Activated Complex
    const yReactants = yScale.getPixelForValue(data.reactantEnergy[0]);
    const yProducts = yScale.getPixelForValue(data.productEnergy[0]);
    const yActivated = yScale.getPixelForValue(data.activatedComplexEnergy[0]);

    const xOffset = 20; // horizontal offset to prevent overlap

    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    ctx.save();

    // ΔH arrow (offset to the right)
    ctx.beginPath();
    ctx.moveTo(xMiddle + xOffset, yReactants);
    ctx.lineTo(xMiddle + xOffset, yProducts);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.stroke();

    const dhDir = yProducts > yReactants ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(xMiddle + xOffset, yProducts);
    ctx.lineTo(xMiddle + xOffset - 5, yProducts - 10 * dhDir);
    ctx.lineTo(xMiddle + xOffset + 5, yProducts - 10 * dhDir);
    ctx.closePath();
    ctx.fillStyle = 'red';
    ctx.fill();

    ctx.font = '16px Arial';
    ctx.fillStyle = 'red';
    const midY_DH = (yReactants + yProducts) / 2;
    ctx.fillText(`ΔH = ${data.rawDeltaH} kJ`, xMiddle + xOffset + 10, midY_DH - 5);

    // Activation Energy (Ea) arrow with both arrowheads
    ctx.beginPath();
    ctx.moveTo(xMiddle, yActivated);
    ctx.lineTo(xMiddle, yReactants);
    ctx.strokeStyle = 'orange';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Arrowhead at top (pointing down)
    ctx.beginPath();
    ctx.moveTo(xMiddle, yActivated);
    ctx.lineTo(xMiddle - 5, yActivated + 10);
    ctx.lineTo(xMiddle + 5, yActivated + 10);
    ctx.closePath();
    ctx.fillStyle = 'orange';
    ctx.fill();

    // Arrowhead at bottom (pointing up)
    ctx.beginPath();
    ctx.moveTo(xMiddle, yReactants);
    ctx.lineTo(xMiddle - 5, yReactants - 10);
    ctx.lineTo(xMiddle + 5, yReactants - 10);
    ctx.closePath();
    ctx.fillStyle = 'orange';
    ctx.fill();

    // Label for Ea (moved further to the left)
    ctx.fillStyle = 'orange';
    const midY_Ea = (yReactants + yActivated) / 2;
    const eaValue = data.activatedComplexEnergy[0] - data.reactantEnergy[0];

    // Adjusted position of Ea label further to the left
    ctx.fillText(`Ea = ${eaValue} kJ`, xMiddle - 90, midY_Ea + 15);

    ctx.restore();
}

// Function to display the thermochemical equation beneath the graph
function displayThermochemicalEquation(reactants, products, deltaH) {
    const equationContainer = document.getElementById('thermochemical-output');
    const equationText = `${reactants.join(' + ')} → ${products.join(' + ')}  ΔH = ${deltaH} kJ`;
    
    // Display the equation with a noticeable style
    equationContainer.innerHTML = `<strong style="font-size: 20px; color: black;">${equationText}</strong>`;
}

// Light/dark mode toggle
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const themeButton = document.getElementById('toggleTheme');
    themeButton.innerHTML = document.body.classList.contains('dark-mode') ? "🌞" : "🌙";
}
