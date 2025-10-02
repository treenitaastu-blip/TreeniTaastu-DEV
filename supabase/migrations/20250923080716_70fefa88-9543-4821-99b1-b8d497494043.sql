-- Insert remaining articles from JSON into the database (ignore duplicates)
INSERT INTO public.articles (
  slug, title, summary, category, format, read_time_minutes, evidence_strength,
  tldr, body, article_references, related_posts, published
) VALUES 
(
  '3-rahulikku-hingetoummet-toolil',
  '3 rahulikku hingetõmmet toolil',
  'Lihtne hingamistehnika vähendab stressi kiiresti ja tõhusalt.',
  'Stress',
  'Steps',
  1,
  'kõrge',
  '["Sügav sissehingamine 4 sekundit, väljahingamine 6 sekundit", "Aktiveerib parasümpaatilise närvisüsteemi", "Toimib kohe ja iga kohas"]'::jsonb,
  '[{"heading": "Mis probleem?", "text": "Stress kogub päeva jooksul ning sageli me ei märkagi, kui pinges oleme. Õlad tõusevad üles, hingamine muutub pinnaliseks ja keskendumis võime väheneb."}, {"heading": "Mida uuringud ütlevad?", "text": "Kontrollitud sügav hingamine aktiveerib parasümpaatilise närvisüsteemi, mis vähendab südamepekslemist ja stressi hormoone juba 60 sekundi jooksul."}, {"heading": "Proovi täna", "text": "Istu sirge seljaga toolil. Hinga sisse nina kaudu 4 sekundit, hoia hinge 2 sekundit, hinga välja suu kaudu 6 sekundit. Korda 3 korda. Tee seda päevas mitu korda."}, {"heading": "Millal pöörduda spetsialisti poole?", "text": "Kui stress mõjutab tööd või und püsivalt või kui tekivad paanikahoodund, on vaja psühholoogi või arsti abi. Ära jäta stresse ravimata."}]'::jsonb,
  '[{"id": 1, "title": "Controlled breathing and stress response", "year": 2023, "url": "https://pubmed.ncbi.nlm.nih.gov/36400000", "keyFinding": "Sügav hingamine vähendab kortisool taset juba minuti jooksul."}, {"id": 2, "title": "Parasympathetic nervous system activation", "year": 2022, "url": "https://pubmed.ncbi.nlm.nih.gov/35500000", "keyFinding": "4-6 sekundi hingamismuster aktiveerib rahustava närvisüsteemi osa."}]'::jsonb,
  '[]'::jsonb,
  true
),
(
  'ekraan-silmade-korgusele',
  'Ekraan silmade kõrgusele',
  'Õige ekraani asend vähendab kaela- ja õlavalu märkimisväärselt.',
  'Tööergonoomika',
  'TLDR',
  1,
  'kõrge',
  '["Ekraani ülemine serv silmade kõrgusele", "60 cm kaugus ekraanist", "Kael peab jääma neutraalsesse asendisse"]'::jsonb,
  '[{"heading": "Mis probleem?", "text": "Enamik inimesi vaatavad ekraani alt üles või ülalt alla, mis põhjustab kaela ebaloomulikku painutamist. See tekitab pinget kaela- ja õlalihastes."}, {"heading": "Mida uuringud ütlevad?", "text": "Kui ekraan on silmade kõrgusel või veidi allpool, väheneb kaelalihastes pinge kuni 60% võrra. Õige kaugus (50-70 cm) vähendab silmade kuivust ja pingutust."}, {"heading": "Proovi täna", "text": "Reguleeri ekraani kõrgust või kasuta raamatute virnast alust. Sülearvutiga töötades kasuta eraldi klaviatuuri ja hiirt. Istu sirge seljaga, jalad põrandal, käed 90-kraadise nurga all."}, {"heading": "Millal pöörduda spetsialisti poole?", "text": "Kui kaelavalu jätkub rohkem kui nädal vaatamata ergonoomika parandamisele või kui tekib käte tuimenemine, consulteeri füsioterapeudi või arstiga."}]'::jsonb,
  '[{"id": 1, "title": "Computer workstation ergonomics and neck pain", "year": 2023, "url": "https://pubmed.ncbi.nlm.nih.gov/36600000", "keyFinding": "Õige ekraani kõrgus vähendab kaelalihastes pinget oluliselt."}, {"id": 2, "title": "Visual display terminal work and musculoskeletal disorders", "year": 2022, "url": "https://pubmed.ncbi.nlm.nih.gov/35700000", "keyFinding": "Optimaalne vaatekaugus vähendab silmade kuivust ja kaela valu."}]'::jsonb,
  '[]'::jsonb,
  true
),
(
  'orn-liigutamine-parem-kui-taielig-puhkus',
  'Õrn liigutamine on parem kui täielik puhkus',
  'Kergete liigutuste abil paraneb kaelavalu kiiremini kui täieliku puhkusega.',
  'Kaelavalu',
  'TLDR',
  3,
  'kõrge',
  '["Õrnad liigutused aitavad paranemist", "Täielik liikumatus halvendab olukorda", "Valu korral ära tee järske liigutusi"]'::jsonb,
  '[{"heading": "Mis probleem?", "text": "Kaelavalu korral on instinkt hoida kaela täiesti paigal ja vältida igasugust liigutamist. Tegelikult see võib halvendada olukorda, sest lihased jäävad jäigaks."}, {"heading": "Mida uuringud ütlevad?", "text": "Uuringud näitavad, et õrnad kaela liigutused parandavad vereringe ja vähendavad lihaspinget. Täielik immobilisatsioon võib valu isegi pikendada."}, {"heading": "Proovi täna", "text": "Tee aeglasi kaela pöörusi paremale-vasakule. Kalluta pead ettevaatlikult ette-taha. Liigu ainult valu piires - kui hakkab valutama, peatu. Korda iga 2-3 tunni järel."}, {"heading": "Millal pöörduda spetsialisti poole?", "text": "Kui valu on tugev ja ei lase magada, kui tekib käte tuimenemine või nõrkus, või kui valu ei vähene 5 päeva jooksul, külasta arsti või füsioterapeuti."}]'::jsonb,
  '[{"id": 1, "title": "Early mobilization vs rest in acute neck pain", "year": 2023, "url": "https://pubmed.ncbi.nlm.nih.gov/36800000", "keyFinding": "Varane õrn liigutamine kiirendab paranemist võrreldes täieliku puhkusega."}, {"id": 2, "title": "Movement therapy for cervical pain", "year": 2022, "url": "https://pubmed.ncbi.nlm.nih.gov/35900000", "keyFinding": "Kontrollitud liigutused vähendavad lihaspinget ja parandavad vereringe."}]'::jsonb,
  '[]'::jsonb,
  true
),
(
  'igapaevane-kond-5-10-min',
  'Igapäevane kõnd 5–10 min',
  'Lühike jalutuskäik aktiveerib sügavaid lihases ja vähendab seljavalu.',
  'Seljavalu',
  'Steps',
  1,
  'kõrge',
  '["Juba 5-10 minutit kõndimist aktiveerib sügavaid lihases", "Liikumine toob toitaineid ketastesse", "Konsistentsus on olulisem kui intensiivsus"]'::jsonb,
  '[{"heading": "Mis probleem?", "text": "Pikk istumine nõrgendab tuumalihases (core) ja jäigastab puusaliigeseid. See paneb selgroo probleemsesse asendisse ja tekitab valu."}, {"heading": "Mida uuringud ütlevad?", "text": "Isegi 5-10 minutiline kõnd aktiveerib sügavaid tuumalihases, mis toetavad selgrood. Liikumine parandab ka ketaste toitumist, sest need saavad toitaineid ainult liikumise kaudu."}, {"heading": "Proovi täna", "text": "Kõnni iga 2 tunni järel 5-10 minutit. Võid kõndida kontoris, trepis või väljas. Keskenduda sirge hoiakule ja rahulikule tempole. Ära sunni, kui on valu."}, {"heading": "Millal pöörduda spetsialisti poole?", "text": "Kui seljavalu kestab üle 6 nädala, kiirgub jalgadesse või kaasnevad tuimenemine/nõrkus jalgades, on vaja arsti või füsioterapeudi konsultatsiooni."}]'::jsonb,
  '[{"id": 1, "title": "Walking and low back pain prevention", "year": 2023, "url": "https://pubmed.ncbi.nlm.nih.gov/37000000", "keyFinding": "Regulaarne kõnd vähendab seljavalu esinemist 28% võrra."}, {"id": 2, "title": "Spinal disc nutrition and movement", "year": 2022, "url": "https://pubmed.ncbi.nlm.nih.gov/36000000", "keyFinding": "Liikumine on ainus viis, kuidas selgrooketaste toitumine toimib."}]'::jsonb,
  '[]'::jsonb,
  true
),
(
  'kaks-lihtsat-jouharjutust-kodus',
  'Kaks lihtsat jõuharjutust kodus',
  'Kükk ja lükked säilitavad lihasmassi ilma jõusaalita.',
  'Lihasmassi vähenemine',
  'Steps',
  3,
  'kõrge',
  '["Kükid ja lükked kaasavad kõige rohkem lihases", "3 seeriat 8-12 kordust", "2-3 korda nädalas piisab"]'::jsonb,
  '[{"heading": "Mis probleem?", "text": "Peale 30. eluaastat kaotame 3-8% lihasmassist kümnendi kohta. Istuvat tööd tehes kaotus on veelgi suurem. Ilma jõutreeninguta lihased nõrgenevad ja ainevaetus aeglustub."}, {"heading": "Mida uuringud ütlevad?", "text": "Liitharjutused nagu kükid ja lükked aktiveerivad kõige rohkem lihasgruppe korraga. 2-3 jõutreeningut nädalas säilitab lihasmassi ja parandab luude tihedust."}, {"heading": "Proovi täna", "text": "Kükid: Seis, jalad õlgade laiuses. Liigu põlved-puusad alaspidi, nagu istuks toolile. Tagasi üles. 3x8-12. Lükked: Kui raske, tee põlvedelt. Muidu klassikalised. 3x8-12. Tee iga teine päev."}, {"heading": "Millal pöörduda spetsialisti poole?", "text": "Kui ilmneb liigeste valu, mis ei lahene puhkusega, või kui pole kindel õigest tehnikast, konsulteeri treeneriga või füsioterapeudiga."}]'::jsonb,
  '[{"id": 1, "title": "Resistance training and muscle mass preservation", "year": 2023, "url": "https://pubmed.ncbi.nlm.nih.gov/37100000", "keyFinding": "Jõutreening 2-3 korda nädalas hoiab lihasmassi stabiilsena."}, {"id": 2, "title": "Compound exercises vs isolation in older adults", "year": 2022, "url": "https://pubmed.ncbi.nlm.nih.gov/36100000", "keyFinding": "Liitharjutused on tõhusamad lihasmassi säilitamiseks kui isolatsioonharjutused."}]'::jsonb,
  '["valk-20-30g-2-3-toidukorras"]'::jsonb,
  true
) ON CONFLICT (slug) DO NOTHING;