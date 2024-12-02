let catLabels = {
  "3d": "3D Viewers",
  "aerial": "Aerial Imagery Sources",
  "carto": "Cartography Inspectors",
  "editor": "Editors",
  "general": "General",
  "indoor": "Indoor Viewers",
  "qa": "Quality Assurance Tools",
  "query": "Query Tools",
  "mapstyle": "Map Styles",
  "router": "Routing Engines",
  "sister": "Sister Projects",
  "streetlevel": "Street-Level Imagery Sources",
  "thematic": "Thematic Viewers",
  "trail": "Trail Maps"
};

let allServices;
const servicesByCat = {};

const params = {};

// default values, can be changed in UI and saved to localStorage
const prefs = {
  targetBlank: false,
  showVisited: true,
}

fetch('data/services.json')
  .then(response => response.json())
  .then(json => {
    addEventListeners();
    loadPrefsFromStorage();
    loadParamsFromUrl();

    allServices = json;
    prepareServiceData();
    reloadPage();
  });

function addEventListeners() {
  document.getElementById('show-visited').addEventListener('change', function(e) {
    setPref('showVisited', e.target.checked);
  });
  document.getElementById('target-blank').addEventListener('change', function(e) {
    setPref('targetBlank', e.target.checked);
  });

  window.addEventListener("hashchange", function() {
    loadParamsFromUrl();
    reloadPage();
  });
}

function setPref(key, val) {
  prefs[key] = val;
  writePrefsToStorage();
  reloadPage();
}

function loadPrefsFromStorage() {
  let storedPrefs = JSON.parse(localStorage.getItem('prefs') || '{}');
  Object.assign(prefs, storedPrefs);
}

function writePrefsToStorage() {
  localStorage.setItem('prefs', JSON.stringify(prefs));
}

function loadParamsFromUrl() {
  let hashMap = hashValue('map');
  if (hashMap) {
    let results = /^([\d\.]+)\/(-?[\d\.]+)\/(-?[\d\.]+)$/.exec(hashMap);
    if (results.length === 4) {
      let z = parseFloat(results[1]);
      let lat = parseFloat(results[2]);
      let lon = parseFloat(results[3]);
      if (isFinite(z) && isFinite(lat) && isFinite(lon)) {
        params.z = z;
        params.lat = lat;
        params.lon = lon;
      }
    }
  }
}

function prepareServiceData() {
  for (let serviceId in allServices) {
    let service = allServices[serviceId];
    service.id = serviceId;

    if (!service.cat) service.cat = 'general';

    if (!servicesByCat[service.cat]) servicesByCat[service.cat] = [];
    servicesByCat[service.cat].push(service);

    if (!service.styles) continue;
    for (let styleId in service.styles) {
      let child = service.styles[styleId];
      child.id = serviceId + '-' + styleId;
      
      child.parentName = service.name;

      // copy over any missing info from service to styles
      if (!child.url) child.url = service.url;
      if (!child.slug) child.slug = service.slug;
      ['hash', 'query'].forEach(dictKey => {
        if (service[dictKey]) {
          if (!child[dictKey]) child[dictKey] = {};
          for (let key in service[dictKey]) {
            if (!child[dictKey][key]) child[dictKey][key] = service[dictKey][key];
          }
        }
      });
    }
  }
}

function makeUrl(service) {
  let url = service.url;

  function replaceTokens(val) {
    for (let paramKey in params) {
      let token = '{{' + paramKey + '}}';
      if (val.includes(token)) {
        let paramVal = params[paramKey];
        val = val.replaceAll(token, paramVal);
      }
    }
    return val;
  }

  function makeKeyValString(dict) {
    let str = "";
    Object.keys(dict).reverse().forEach(function(key) {
      let val = dict[key];
      if (val.includes('{{')) {
        val = replaceTokens(val);
        if (!val.includes('{{')) {
          str += key === '' ? val : key + '=' + val + '&';
        }
      } else {
        str += key === '' ? val : key + '=' + val + '&';
      }
    });
    if (str.length && str[str.length - 1] === '&') {
      str = str.slice(0, -1);
    }
    return str;
  }

  if (service.slug) {
    let slug = replaceTokens(service.slug);
    if (!slug.includes('{{')) {
      url += slug;
    }
  } 
  if (service.hash) {
    let str = makeKeyValString(service.hash);
    if (str.length) url += '#' + str;
  }
  if (service.query) {
    let str = makeKeyValString(service.query);
    if (str.length) url += '?' + str;
  }
  return url;
}

function reloadPage() {

  prefs.showVisited ? document.body.classList.add('show-visited') : document.body.classList.remove('show-visited');

  let html = "";

  for (let cat in servicesByCat) {
    let services = servicesByCat[cat];

    let calLabel = catLabels[cat] || cat;

    html += `<h2>${calLabel}</h2>`;
    html += `<ul class="services">`;

    for (let i in services) {
      let service = services[i];
      if (service.hidden) continue;
        
      html += `<li id="${service.id}" class="service">`;
      html += `<span class="service-name">`;
      if (service.url) html += `<a href="${makeUrl(service)}" ${prefs.targetBlank ? 'target="_blank"' : ''}>`
      html += service.name;
      html += `</span>`;
      if (service.parentName) {
        html += ' on ' + service.parentName;
      }
      if (service.url) html += `</a>`;
      html += `<span class="icon-links">`;
      if (service.github) html += `<a href="https://github.com/${service.github}" target="_blank"><img src="img/github.svg"/></a>`;
      if (service.gitlab) html += `<a href="https://gitlab.com/${service.gitlab}" target="_blank"><img src="img/gitlab.svg"/></a>`;
      html += `</span>`;
      if (service.styles) {
        html += '<ul class="styles">';
        for (let j in service.styles) {
          let style = service.styles[j];
          if (style.hidden) continue;
          html += `<li id="${style.id}" class="style">`
          html+= `<a href="${makeUrl(style)}" ${prefs.targetBlank ? 'target="_blank"' : ''} class="style-name" ${style.title ? 'title="' + style.title + '"' : ''}>`;
          html += style.name;
          html += `</a></li>`;
        }
        html += '</ul>';
      }
      html += '</li>';
    }
    html += `</ul>`;
  }

  document.getElementById('content').innerHTML = html;

  document.getElementById('show-visited').checked = prefs.showVisited;
  document.getElementById('target-blank').checked = prefs.targetBlank;

  let descHtml = `<p>This is a directory of links to <a href="https://www.openstreetmap.org/about" target="_blank">OpenStreetMap</a>-related projects.</p>`;

  if (params.z && params.lat && params.lon) {
    descHtml += `<p>Pages will open at latitude <code>${params.lat}</code>, longitude <code>${params.lon}</code>, and zoom <code>${params.z}</code>. <a href="#">Clear</a></p>`;
  } else {
    descHtml += `<p>You can set a common viewport by setting the URL hash like <code>#map=zoom/lat/lon</code>. <a href="#map=14/39.952399/-75.163613">Example</a></p>`;
  }
  document.getElementById('header-desc').innerHTML = descHtml;
}

function hashValue(key) {
  let searchParams = new URLSearchParams(window.location.hash.slice(1));
  if (searchParams.has(key)) return searchParams.get(key);
  return null;
}