// Les imports pour lui dire j'ai besoin de cette app de cette objet ect. 
import './style.css';
import {Map, View} from 'ol';
import { ImageWMS } from 'ol/source';
import TileLayer from 'ol/layer/Tile';
import ImageLayer from 'ol/layer/Image';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON.js';
import VectorLayer from 'ol/layer/Vector';
import {Circle, Fill, Stroke, Style} from 'ol/style.js';
import ScaleLine from 'ol/control/ScaleLine.js' //pour ajouter l'echelle 


// Je sors la couche OSM de l’objet Map pour la stocker dans une variable
const scaleline = new ScaleLine(); //On appelle ici le scale 
const couche_osm = new TileLayer({ source: new OSM() });


// ================== Import de mes 3 couches wms ===================

// Impoter la couche deals 
const deals = new ImageLayer({
  source: new ImageWMS({
    url: 'http://localhost:8090/geoserver/workflow/wms',
    params: {'LAYERS' : 'workflow:deals_agri'
    },
    serverType: 'geoserver',
  }),
});

// ===================== Impoter la couche de fond des pays avec des deals ===================
const country = new ImageLayer({
  source: new ImageWMS({
    url: 'http://localhost:8090/geoserver/workflow/wms',
    params: {'LAYERS' : 'workflow:country_with_deals'},
    serverType: 'geoserver',
  }),
});

// Import la couche deals_by_country_centroids
const vecteur_Centroid = new VectorSource({
  format: new GeoJSON(),
  url: 'http://localhost:8090/geoserver/workflow/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=workflow%3Adeals_by_country_centroid&maxFeatures=50&outputFormat=application%2Fjson'
});

// On peux maintenant configurer le style de la couche 
function getStyleCentroid(feature) {
  const nDeals = feature.get('n_deals');
  const rayon = Math.sqrt(nDeals) * 2.2;
  const style = new Style({
    image: new Circle({
      radius: rayon,
      fill: new Fill({ color: '#fac460da'}),
      stroke: new Stroke({ color: 'blue', width: 0.2 }),
    }),
  });
  return style;
}

// On configure ici la couche vecteur 
const deals_by_country_centroids = new VectorLayer({
  source: vecteur_Centroid,
  style: getStyleCentroid  // Pour nommé notre style 
});

// ===================== On ajoute ici la carte ======================
// Création de l’objet map avec appel de mes deux couches "couche_osm" et "ma_couche" dans layers
const map = new Map({
  target: 'map',
  controls: [scaleline], // Pour ajouter l'echelle 
  layers: [ couche_osm,country, deals,deals_by_country_centroids ],
  view: new View({
    center: [0, 0],
    zoom: 2
  })
});


// ================  Creer la fonction qui affiche et masque nos couche ================= 

// Ce code masque les couche country centroids
deals_by_country_centroids.setVisible(false);

// Fonctions pour afficher et masquer la couche country 
const checkbox_countries = document.getElementById('checkbox-countries');
checkbox_countries.addEventListener('change', (event) => {
  if (event.currentTarget.checked) {
    // On fait des trucs quand la checkbox est checkée
    country.setVisible(true);
  } else {
    // On fait des trucs quand la checkbox n’est PAS checkée
    country.setVisible(false);
  }
});

// On vas definir ici le comportement des checkbox 
// est leurs incidences sur les elements de la carte 

// On appelle les checkbox pas leur id
const checkbox_deals = document.getElementById('checkbox-deals');
const checkbox_centroide = document.getElementById('checkbox-centroide');
const div_filtre = document.getElementById('production');
const legende_raster = document.getElementById('legend-raster');
const legende_vector = document.getElementById('legend-vecteur');


// Par défaut la legende centroide est masque
legende_vector.style.display = 'none';

// Fonctions pour afficher et masquer la couche deals
// si le chekbox est cocher  la div filtre et affiche 
checkbox_deals.addEventListener('change', (event) => {
  if (event.currentTarget.checked) {
    deals.setVisible(true);
    deals_by_country_centroids.setVisible(false);
    div_filtre.style.display = 'block';
    legende_raster.style.display = 'flex';
    legende_vector.style.display = 'none';
  }
});

// Fonctions pour afficher et masquer la couche deals_by_country_centroids
// si le chekbox est cocher  la div filtre et masquer
checkbox_centroide.addEventListener('change', (event) => {
  if (event.currentTarget.checked) {
    deals_by_country_centroids.setVisible(true);
    deals.setVisible(false);
    div_filtre.style.display = 'none';
    legende_raster.style.display = 'none';
    legende_vector.style.display = 'block';
  }
});


// ======================= Intéroger la couche WMS ========================

// On vas ici utiliser la fonction fetch pour allez chercher 
// les information de la couche et les afficher dans notre rable

map.on('singleclick', (event) => {
  const coord = event.coordinate;
  const view = map.getView();
  const res = view.getResolution();
  const proj = 'EPSG:3857';
  const parametres = {'INFO_FORMAT': 'application/json'};

  // =========== (Tableaux) Récupérer la source de la couche =============
  const sourceDeals = deals.getSource();
  const url = sourceDeals.getFeatureInfoUrl(coord, res, proj, parametres);
  if (url) {
    fetch(url)
      .then((response) => response.text())
      .then((json) => {
        const obj = JSON.parse(json);
        if (obj.features[0]) {
          const properties = obj.features[0].properties;
          // On affiche les information dans notre table
          document.getElementById('table-deal-id').innerHTML = properties.deal_id;
          document.getElementById('table-creation-date').innerHTML = properties.created_at;
          document.getElementById('table-country').innerHTML = properties.target_country;
          document.getElementById('table-crops').innerHTML = properties.crops;
        } else {
          // On a cliqué "nulle part" donc on remet des … dans les colonnes
          document.getElementById('table-deal-id').innerHTML = "...";
          document.getElementById('table-creation-date').innerHTML = "...";
          document.getElementById('table-country').innerHTML = "...";
          document.getElementById('table-crops').innerHTML = "...";
        }
      });
  }
});


// ================ Paraméter les checkbox pour les types de productions =================== 

// Pour tous afficher 
const buttonTout = document.getElementById('button-tous');
buttonTout.addEventListener('change', () => {
  deals.getSource().updateParams({ 'CQL_FILTER' : '' });
});

const buttonGold = document.getElementById('button-oil_palm');
buttonGold.addEventListener('change', () => {
  deals.getSource().updateParams({ 'CQL_FILTER' : 'oil_palm=true' });
});

const buttonCharbon = document.getElementById('button-soya_beans');
buttonCharbon.addEventListener('change', () => {
  deals.getSource().updateParams({ 'CQL_FILTER' : 'soya_beans=true' });
});

const buttonSilver = document.getElementById('button-sugar_cane');
buttonSilver.addEventListener('change', () => {
  deals.getSource().updateParams({ 'CQL_FILTER' : 'sugar_cane=true' });
});



// ========================== Légende =============================

// Nom du style à récupérer
const styleName = 'agri_deals_by_country';
const styleName2 = 'deals_agri_style';

// Génération de l'URL de la légende avec le style spécifié
const legendUrl = `${deals.getSource().getUrl()}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&FORMAT=image/png&LAYER=workflow:deals_agri&STYLE=${styleName}`;
const legendUrl2 = `${deals.getSource().getUrl()}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&FORMAT=image/png&LAYER=workflow:deals_agri&STYLE=${styleName2}`;

// Assignation de l'URL à l'élément <img>
document.getElementById('legend-image2').src = legendUrl;
document.getElementById('legend-image1').src = legendUrl2;

