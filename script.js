const nf = new Intl.NumberFormat('en-US')

layer.on('status', function (e) {
  if (e.type === 'lock') {
    e.message ? hideResizeHandle() : displayResizeHandle();
  }
});

function displayResizeHandle() {
  document.documentElement.classList.add("resizeHandle")
}

function hideResizeHandle() {
  document.documentElement.classList.remove("resizeHandle")
}

function round(value, precision) {
  var multiplier = Math.pow(10, precision || 0);
  return Math.round(value * multiplier) / multiplier;
}

function formatAccuracy(value) {
  value = value.replace(/,/g, '.'); // handle comma-decimals
  if (isNaN(value) || value === '100.00') return '';
  return nf.format(round(value, 1).toFixed(1)) + '%';
}

function formatCritrate(value) {
	if (value === '0%') return '';
	return value;
}

function formatDps(value) {
	if (isNaN(value)) return '0/sec';
	return nf.format(value) + '/sec';
}

document.addEventListener('DOMContentLoaded', function () {
  const q = new URLSearchParams(this.location.search);

  if (q.get('font') === 'kr') {
    document.documentElement.setAttribute('lang', 'kr')
  }

  const style = document.createElement('style');
  style.textContent = `
    .rgb-gradient {
      background: linear-gradient(-45deg, #ff0000, #ff8000, #ffff00, #00ff00, #00ffff, #0080ff, #0000ff, #8000ff, #ff00ff) !important;
      background-size: 200% 200% !important;
      animation: gradientFlow 6s ease infinite;
      opacity: 0.9;
    }
    @keyframes gradientFlow {
      0% { background-position: 0% 50%; }
      25% { background-position: 100% 0%; }
      50% { background-position: 100% 100%; }
      75% { background-position: 0% 100%; }
      100% { background-position: 0% 50%; }
    }
  `;
  document.head.appendChild(style);

  layer.connect();
  layer.on('data', updateDPSMeter);

  setupZoomControls()
})

let popperInstance = null

function updateDPSMeter(data) {
  document.getElementById('boss-name').innerText = data.Encounter.title || 'No Data'

  let table = document.getElementById('combatantTable')
  table.innerHTML = ''

  let combatants = Object.values(data.Combatant)
  
  // Convert string damage values to numbers properly by removing commas
  combatants.forEach(combatant => {
    if (typeof combatant.damage === 'string') {
      // Remove commas and convert to number
      combatant.damage = Number(combatant.damage.replace(/,/g, ''))
    }
    
    if (typeof combatant.DPS === 'string' && combatant.DPS !== '∞') {
      // Remove commas and convert to number
      combatant.DPS = Number(combatant.DPS.replace(/,/g, ''))
    }
  })
  
  // Sort by damage value (now as numbers, not strings)
  combatants.sort((a, b) => b.damage - a.damage)

  const maxDamage = combatants.length > 0 
    ? Math.max(...combatants.map((c) => c.damage || 0)) 
    : 0

  combatants.forEach((combatant) => {
    const currentDamage = combatant.damage || 0
    const widthPercentage = maxDamage > 0 
      ? (currentDamage / maxDamage) * 100 
      : 0

    let playerDiv = document.createElement('div')
    
    playerDiv.setAttribute('data-player', combatant.name)
    
    playerDiv.classList.add('player')

    if (combatant.name === 'You' || combatant.isSelf === "true") {
      playerDiv.classList.add('you')
    }

    let dpsBar = document.createElement('div')
    dpsBar.className = 'dps-bar'

    let gradientBg = document.createElement('div')
    gradientBg.className = 'gradient-bg'

    gradientBg.style.clipPath = `inset(0 ${100 - widthPercentage}% 0 0)`

    let barContent = document.createElement('div')
    barContent.className = 'bar-content'

    const name = document.createElement('span')
    name.className = 'dps-bar-label'
    name.textContent = combatant.name

    const critrate = document.createElement('span')
    critrate.className = 'dps-bar-critrate'
    critrate.textContent = combatant['crithit%'] ? formatCritrate(combatant['crithit%']) : ''

    const tohit = document.createElement('span')
    tohit.className = 'dps-bar-tohit'
    tohit.textContent = combatant['tohit'] ? formatAccuracy(combatant['tohit']) : ''

    const dps = document.createElement('span')
    dps.className = 'dps-bar-value'
    dps.textContent = formatDps(combatant.DPS)

    barContent.appendChild(name)
    barContent.appendChild(tohit)
    barContent.appendChild(critrate)
    barContent.appendChild(dps)
    dpsBar.appendChild(gradientBg)
    dpsBar.appendChild(barContent)
    playerDiv.appendChild(dpsBar)
    table.appendChild(playerDiv)
  })
}

function showSkills(combatant, event) {
  const skillDetails = document.getElementById('skill-details')
  const referenceElement = {
    getBoundingClientRect: () => ({
      width: 0,
      height: 0,
      top: event.clientY,
      right: event.clientX,
      bottom: event.clientY,
      left: event.clientX,
    }),
  }

  let skillHTML = `
      <div class="skill-summary">Total Damage: ${combatant['damage-*']} (${combatant['damage%']})</div>
      <div class="skill-summary">Hits: ${combatant['hits']}</div>
      <div class="skill-summary">Total Crit %: ${combatant['crithit%']}</div>
      <div class="skill-summary">Max Hit: ${combatant['maxhit-*']}</div>
      <div class="skill-labels">
          <span>Skill</span>
          <span>Hits</span>
          <span>Crit %</span>
          <span>Damage</span>
      </div>`
      
  skillHTML += `<div class="skill">No skill data available</div>`
  skillDetails.innerHTML = skillHTML
  skillDetails.style.display = 'block'

  if (popperInstance) {
    popperInstance.destroy()
  }

  popperInstance = Popper.createPopper(referenceElement, skillDetails, {
    placement: 'right-start',
    modifiers: [
      {
        name: 'offset',
        options: {
          offset: [0, 10],
        },
      },
      {
        name: 'preventOverflow',
        options: {
          padding: 10,
        },
      },
      {
        name: 'flip',
        options: {
          padding: 10,
        },
      },
    ],
  })
}

function hideSkills() {
  const skillDetails = document.getElementById('skill-details')
  skillDetails.style.display = 'none'
  if (popperInstance) {
    popperInstance.destroy()
    popperInstance = null
  }
}

function setupZoomControls() {
  const zoomOutBtn = document.getElementById('zoom-out');
  const zoomInBtn = document.getElementById('zoom-in');
  const root = document.documentElement;

  let currentZoom = 100; 
  const minZoom = 50;
  const maxZoom = 200;
  const zoomStep = 10;

  const savedZoom = localStorage.getItem('dpsMeterZoom');
  if (savedZoom) {
    currentZoom = parseInt(savedZoom);
    applyZoom();
  }

  function applyZoom() {
    root.style.fontSize = `${currentZoom / 100}rem`;
    
    localStorage.setItem('dpsMeterZoom', currentZoom);
  }

  zoomOutBtn.addEventListener('click', () => {
    currentZoom = Math.max(minZoom, currentZoom - zoomStep);
    applyZoom();
  });

  zoomInBtn.addEventListener('click', () => {
    currentZoom = Math.min(maxZoom, currentZoom + zoomStep);
    applyZoom();
  });

  document.querySelectorAll('.zoom-btn').forEach(element => {
    element.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });
  });
}

document.removeEventListener('DOMContentLoaded', setupZoomControls);
