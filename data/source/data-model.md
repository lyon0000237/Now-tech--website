# NowTech Center — Modele de donnees (rebranding backend)

## Vue d'ensemble
- Plateforme source : WooCommerce (WordPress)
- Produits : ~4256 (tous de type "simple", aucun produit variable/variation detecte)
- Categories : 267 au total => 46 racines + 221 sous-categories
- Profondeur de la hierarchie de categories : 3 niveaux
- Attributs produits utilises : ["Marques","Résolution","Nombre de Ports","Couleurs","Fréquence","FREQUENCE"]
- Marques : taxonomie peu renseignee (souvent portee par l'attribut "Marques")
- Tags : largement utilises

## Entites principales
- Product (produit simple) 1--1 Price
- Product 1--* Image (image principale = index 1 + galerie)
- Product *--* Category (une categorie principale + categories multiples possibles)
- Product *--* Tag
- Product *--* Attribute (valeurs multiples par attribut)
- Product *--0..1 Brand
- Category *-- Category (auto-relation parent/enfant, 3 niveaux)

## Diagramme de classes (Mermaid)
Colle ce bloc dans https://mermaid.live ou un fichier .md compatible Mermaid :

```mermaid
classDiagram
    class Product {
        +int id
        +string name
        +string slug
        +string sku
        +string type  %% "simple"
        +string short_description
        +string description
        +bool on_sale
        +bool is_in_stock
        +string permalink
    }
    class Price {
        +int price
        +int regular_price
        +int sale_price
        +string currency_code
        +int currency_minor_unit
    }
    class Image {
        +int id
        +string src
        +string thumbnail
        +string srcset
        +string alt
    }
    class Category {
        +int id
        +string name
        +string slug
        +string description
        +int parent
        +int count
        +Image image
    }
    class Tag {
        +int id
        +string name
        +string slug
    }
    class Attribute {
        +int id
        +string name  %% Marques, Resolution, Nombre de Ports, Couleurs, Frequence
        +string[] terms
    }
    class Brand {
        +int id
        +string name
        +string slug
    }

    Product "1" *-- "1" Price : has
    Product "1" *-- "0..*" Image : gallery
    Product "*" --> "1..*" Category : categorized_in
    Product "*" --> "0..*" Tag : tagged_with
    Product "*" --> "0..*" Attribute : has_attributes
    Product "*" --> "0..1" Brand : brand
    Category "1" o-- "0..*" Category : parent_of  %% hierarchie 3 niveaux

```

## Arborescence complete des categories (nom + nb produits)
- .Ordinateurs  (541 produits)
  - ALL IN ONE  (18 produits)
  - Ecrans Moniteurs  (69 produits)
  - Ordinateur de Bureau/ Desktop  (94 produits)
    - Desktop DELL  (14 produits)
    - Desktop HP  (73 produits)
    - Desktop Lenovo  (12 produits)
  - Ordinateurs portables / Laptop  (306 produits)
    - Laptop ASUS  (5 produits)
    - Laptop DELL  (16 produits)
    - Laptop HP  (188 produits)
    - Laptop LENOVO  (83 produits)
    - Laptop MAC  (7 produits)
    - Surface Pro  (4 produits)
  - Serveurs  (53 produits)
    - Accessoires serveurs  (12 produits)
    - Serveur Dell  (13 produits)
    - Serveurs HP  (16 produits)
- Accessoires de sécurité électronique  (3 produits)
- Accessoires électriques et rallonges  (15 produits)
  - Multimètre  (3 produits)
- Accessoires Ordinateurs  (285 produits)
  - Afficheurs Laptop  (7 produits)
  - Batteries Laptop  (24 produits)
  - Cartes Graphiques  (12 produits)
  - Casques  (13 produits)
  - chargeurs laptop  (18 produits)
  - Claviers Externes Ordinateurs  (14 produits)
  - Claviers Laptop  (10 produits)
  - clés USB  (16 produits)
  - Ecran Projecteur  (3 produits)
  - Lecteurs CD/DVD  (3 produits)
  - RAM Desktop  (7 produits)
  - RAM Laptop  (20 produits)
  - Ram Serveur  (8 produits)
  - Sacs Laptop  (5 produits)
  - souris  (30 produits)
  - Tapis souris  (2 produits)
    - TRADUCTEUR  (1 produits)
  - Webcam pc camera  (10 produits)
- ALIMENTATION CHARGEUR  (12 produits)
- antenne  (1 produits)
- Appareils photo  (20 produits)
- Backup Electrique/Solaire  (46 produits)
  - Système Solaire  (36 produits)
    - KIT SOLAIRE  (1 produits)
- batterie  (21 produits)
- bureautique  (7 produits)
- CAISSE ENREGISTREUSE  (10 produits)
- Calculatrices  (1 produits)
- Chargeur Alimentation ubitiqui  (2 produits)
- Compteurs Billets/Detecteurs Faux Billets  (8 produits)
- Connectiques  (205 produits)
  - Adaptateurs/Cartes/Convertisseurs  (135 produits)
    - Adaptateurs Divers  (9 produits)
    - HDMI/VGA/Display  (28 produits)
    - Splitter/Extendeur  (19 produits)
    - TYPE C  (18 produits)
  - Cables HDMI/mini HDMI  (32 produits)
  - Câbles Informatiques  (34 produits)
  - Cables Reseaux  (5 produits)
  - Cables VGA  (6 produits)
- Consommables Imprimantes  (229 produits)
  - Cartouche de nettoyage  (1 produits)
  - Encre EPSON  (4 produits)
  - Encre HP  (114 produits)
  - Encre RICOH  (4 produits)
  - Encres CANON  (57 produits)
  - Papier ruban  (23 produits)
  - Tambours/raclette/rouleau  (12 produits)
- Controleur de charge  (10 produits)
- Dictaphones  (5 produits)
- DIVERS  (33 produits)
  - Destructeurs papiers  (2 produits)
- DRONES  (7 produits)
- Electromenager/TV/Audio  (194 produits)
  - Appareils Music AUDIO/HIFI  (41 produits)
  - Electroménager  (83 produits)
  - Télévisions TV/Ecrans Plats  (68 produits)
    - Ecran TV Skill Tech  (13 produits)
    - Téléviseur HISENSE  (11 produits)
    - Téléviseurs LG  (32 produits)
- Gadgets Smart  (44 produits)
  - Masseur Smart  (18 produits)
  - microphone  (13 produits)
- Imprimantes &amp; Scanner  (288 produits)
  - .Scanners  (30 produits)
  - Étiqueteuses  (18 produits)
  - Imprimantes/Copieurs  (239 produits)
    - Autres Imprimantes  (2 produits)
    - Imprimante PVC Evolis  (8 produits)
    - Imprimantes CANON  (68 produits)
      - Canon Jet D&#8217;encre/ Ecotank  (26 produits)
      - Canon Laser Couleur  (8 produits)
      - Canon Laser Monochrome(N/B)  (14 produits)
      - Copieur Canon Photocopieuse  (3 produits)
    - Imprimantes EPSON  (28 produits)
    - Imprimantes HP  (94 produits)
      - HP Jet d&#8217;encre/ EcoTank  (24 produits)
      - HP Laser Couleur  (19 produits)
      - HP Laser Monochrome (N/B)  (33 produits)
    - Imprimantes mobiles  (4 produits)
    - Imprimantes RICOH  (15 produits)
    - Imprimantes Thermiques  (10 produits)
    - Imprimantes ZEBRA  (9 produits)
- inverseur  (3 produits)
- JEUX VIDEOS ET CONSOLES  (13 produits)
- Lampe Solaire  (2 produits)
- LOGITECH  (12 produits)
  - VideoConference  (4 produits)
- Materiels de Bureautique  (8 produits)
  - Coupe papier  (6 produits)
- Nos Services  (32 produits)
- Occasion  (10 produits)
- Onduleurs &amp; Batteries  (185 produits)
  - Batteries Onduleurs  (20 produits)
    - Onduleur HIKVION  (4 produits)
  - MINI UPS  (21 produits)
  - OLA  (1 produits)
  - Onduleur ECUS  (4 produits)
  - Onduleur PREMAX  (9 produits)
  - Onduleur SALICRU  (16 produits)
  - Onduleur SUKAM  (3 produits)
  - Onduleurs ANC  (7 produits)
  - onduleurs APC  (44 produits)
  - Onduleurs EATON  (5 produits)
  - Onduleurs EURONET  (6 produits)
  - Onduleurs LIGHTWAVE  (13 produits)
  - Onduleurs MERCURY  (7 produits)
  - Onduleurs NITRAM  (1 produits)
  - Onduleurs Tripp Lite  (1 produits)
- outils  (27 produits)
- PROJECTEURS  (11 produits)
  - projecteur SMART  (10 produits)
- rallonge  (3 produits)
- Régulateurs de Tension  (66 produits)
  - Regulateur de tension mural yaki  (2 produits)
  - Regulateur de tension YAKI  (4 produits)
  - Régulateurs de tension ANDELI  (9 produits)
  - Régulateurs de tension Delta  (20 produits)
  - Regulateurs de Tension Euronet  (3 produits)
  - Regulateurs de Tension Lightwave  (14 produits)
- Réseaux et Télecommunication  (849 produits)
  - .Baies/Panneaux/ Plateau  (47 produits)
  - .Téléphonie  (128 produits)
    - Autocom PBX  (32 produits)
    - Passerelle Gateway  (14 produits)
    - telephone fanvil  (4 produits)
    - Téléphones CISCO  (1 produits)
    - Téléphones GrandStream  (26 produits)
    - Telephones IP Mobiles  (1 produits)
    - Téléphones Panasonic  (21 produits)
    - Téléphones Yeaklink  (13 produits)
  - Amplificateur de Signal  (20 produits)
  - Câblage/Testeurs/ Accessoires Réseaux  (146 produits)
    - Câbles Réseaux  (47 produits)
    - Connecteurs/Prises/Coupleurs  (27 produits)
    - Panneaux/plateaux/Accessoires  (12 produits)
    - Pinces a Sertir  (6 produits)
    - Testeurs  (14 produits)
  - Fibre Optique  (39 produits)
    - Module SFP  (5 produits)
  - modem  (15 produits)
  - Routeurs/AP Wifi/ Antennes Radio  (302 produits)
    - Acces Point Grandstream  (12 produits)
    - Radio sans fil UBIQUITI  (37 produits)
    - Routeur Wavlink  (1 produits)
    - Routeurs/AP Cisco  (12 produits)
    - Routeurs/AP COMMANDO  (25 produits)
    - Routeurs/AP D-LINK  (15 produits)
    - Routeurs/AP HUAWEI  (5 produits)
    - Routeurs/AP LINKSYS  (4 produits)
    - Routeurs/AP TENDA  (15 produits)
    - Routeurs/AP TP-LINK  (74 produits)
    - Routeurs/AP/Antennes Mikrotik  (54 produits)
  - Switchs  (147 produits)
    - NETGEAR  (4 produits)
    - switch DAHUA  (2 produits)
    - Switch HIKVISION  (8 produits)
    - Switch Mikrotik  (8 produits)
    - Switchs CISCO  (32 produits)
    - Switchs D-LINK  (33 produits)
    - Switchs TP-LINK  (32 produits)
    - Switchs UBIQUITI  (11 produits)
  - UTM/Firewall/QoS  (11 produits)
    - Fortigate  (10 produits)
- Securité Electronique/Biometrie  (751 produits)
  - .Caméras de Surveillance  (442 produits)
    - Alimentation Caméras  (9 produits)
    - Autres Cameras  (20 produits)
    - Camera Espion  (1 produits)
    - Camera tenda  (3 produits)
    - Cameras CP Plus  (1 produits)
    - Cameras D-LINK  (1 produits)
    - Cameras DAHUA  (59 produits)
    - Caméras EURONET  (1 produits)
    - Cameras HIKVISION  (99 produits)
    - Cameras Multistar  (16 produits)
    - Cameras PREMAX  (17 produits)
    - Cameras Smart Autonome  (33 produits)
    - Cameras Solaires  (14 produits)
    - Cameras UNIVIEW UNV  (12 produits)
    - Kit Caméras  (5 produits)
    - NVR/DVR pour Cameras  (117 produits)
      - DVR Dahua  (14 produits)
      - DVR HIKVISION  (21 produits)
      - NVR DAHUA  (9 produits)
      - NVR HIKVISION  (37 produits)
      - NVR TIANDY  (4 produits)
      - NVR UNIVIEW UNV  (2 produits)
  - accessoires de sécurité électronique  (3 produits)
  - Accessoires Securité Electroniques  (35 produits)
    - Bras de rappel porte  (2 produits)
    - détecteur de métaux  (5 produits)
    - Detecteurs de mouvement  (5 produits)
  - Alarme smart autonome  (16 produits)
  - Alarmes  (74 produits)
    - Alarme Anti Incendie  (39 produits)
    - Alarme Anti Intrusion  (35 produits)
    - Pyronix  (3 produits)
  - GPS Garmin  (28 produits)
  - GPS Tracker  (12 produits)
  - Interphones  (36 produits)
  - Système Contrôle Accès/presence  (108 produits)
    - Autres lecteurs/pointeuses  (18 produits)
    - Gâches/Ventouses  (6 produits)
    - Lecteurs/pointeuses HIKVISION  (22 produits)
    - Lecteurs/pointeuses IPBio  (10 produits)
    - Lecteurs/pointeuses SUPREMA  (4 produits)
    - Lecteurs/pointeuses ZKTeco  (44 produits)
    - Serrure Electrique intelligente  (6 produits)
- Sérigraphie  (8 produits)
- Smartphones et Tablettes  (27 produits)
- Stockages/disques Dur  (178 produits)
  - Boitiers disque dur  (7 produits)
  - Cartes mémoires  (7 produits)
  - Clés USB Pendrive  (9 produits)
  - Disques Dur Externe  (41 produits)
  - Disques Dur sata 2.5 Laptop et SSD  (28 produits)
  - Disques Dur sata 3.5 Desktop et Camera  (27 produits)
  - Disques Dur serveur et SAS  (20 produits)
  - Stockage NAS  (34 produits)
    - Nas QNAP  (17 produits)
    - Nas Synology  (10 produits)
- Support Ecran, Laptop, TV, Projecteur  (28 produits)
- Systèmes/Logiciels  (39 produits)
  - Antivirus  (14 produits)
  - Autres logiciels  (13 produits)
  - Système d&#8217;Exploitation Windows  (25 produits)
- Telephones Mobile &amp; Tablettes  (77 produits)
  - .Téléphones Mobiles  (37 produits)
    - telephone huawei  (1 produits)
    - Téléphones INFINIX  (3 produits)
    - Téléphones ITEL  (1 produits)
    - Téléphones TECNO  (28 produits)
    - Téléphones XIAOMI  (3 produits)
  - Accessoires ORAIMO  (13 produits)
    - Chargeurs Oraimo  (4 produits)
    - Ecouteurs Oraimo  (4 produits)
    - power bank oraimo  (4 produits)
  - Accessoires Téléphones et Tablettes  (4 produits)
  - tablette pour enfant  (10 produits)
  - Tablettes  (16 produits)
  - Téléphones Fixes GSM  (3 produits)
- Tmartphones et Tablettes  (1 produits)
- TRADUCTEUR SMART  (1 produits)
- Vidéoprojecteurs  (52 produits)
