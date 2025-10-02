-- Add more diverse health articles
INSERT INTO articles (
  slug, title, summary, content, excerpt, category, format, 
  read_time_minutes, evidence_strength, tags, author, 
  meta_description, published
) VALUES 
(
  'proteiini-vajadus-sportimisel',
  'Kui palju valku vajab sportlane',
  'Sportijate valkude vajadus on 1,2-2,2g/kg kehakaalust päevas, sõltuvalt trenni intensiivsusest ja eesmärkidest.',
  '**Valkude roll sportlase organismis**

Valgud on ehitusmaterjal lihasele ja aitavad taastumisprotsessidel. Sportijate vajadused on tavainimestest kõrgemad.

**Valkude vajadus treeningu järgi:**

• **Vastupidavussport** (jooksmine, ujumine): 1,2-1,4 g/kg
• **Jõutreening** (kehatreening, kulturism): 1,6-2,2 g/kg  
• **Segarehasport** (jalgpall, tennis): 1,4-1,7 g/kg
• **Tavalise inimese vajadus**: 0,8-1,0 g/kg

**Parimad valguallikad:**
- Liha, kala, linnuliha
- Munad ja piimatooted
- Kaunviljad ja pähklid
- Valgupulber (vajaduse korral)

**Ajakava:**
- 20-30g valku iga 3-4 tunni järel
- 30-45g valku 2 tunni jooksul pärast treeningut
- Kaseiinvalk enne und (aeglane imendumine)

**Märkused:**
Liigne valk (üle 3g/kg) ei anna lisahüvet ja koormab neerusid. Tasakaalustatud toitumine on võti.

**Praktilised näpunäited:**
- 100g kanarinnahast ≈ 23g valku
- 1 muna ≈ 6g valku  
- 1 klaas piima ≈ 8g valku
- 30g mandleid ≈ 6g valku',
  'Sportijate valkude vajadus sõltub trenni tüübist ja intensiivsusest.',
  'Toitumine',
  'TLDR',
  4,
  'kõrge',
  ARRAY['valk', 'sport', 'toitumine', 'treening'],
  'Sporditeadlane Dr. Karin Alev',
  'Kui palju valku vajab sportlane - teaduspõhised soovitused erinevate spordialade jaoks.',
  true
),
(
  'plangi-harjutus-tuumiku-tugevdamiseks',
  'Plank - täiuslik harjutus tuumikule',
  'Plank-harjutus tugevdab kogu keha tuumikut ja parandab rühti vaid 30 sekundiga päevas.',
  '**Miks plank on nii efektiivne?**

Plank aktiveerib kogu keha tuumiku - kõhulihased, seljalihased, õlad ja puusad töötavad koos stabiilsuse tagamiseks.

**Õige tehnika:**

1. **Algseis:**
   - Käed õlgade all, randmed sirged
   - Keha sirge joon päast kandadeni
   - Pilk põranda poole

2. **Positsioon:**
   - Kõht pinges, hingamine normaalne  
   - Puusad ei langé ega kerkí
   - Jalad koos või õlalaiuselt

3. **Levinud vead:**
   - Puusakõrguse muutmine
   - Pea liiga üles või alla
   - Hingamise kinnihoidmine

**Progressioon algajatele:**
- **1. nädal:** 3x15 sekundit
- **2. nädal:** 3x20 sekundit  
- **3. nädal:** 3x30 sekundit
- **4. nädal:** 3x45 sekundit

**Variatsoonid:**
- **Põlvetoega plank** - algajatele
- **Külgplank** - kõrvallihastele
- **Plank jalgade tõstmisega** - raskemaks

**Kasud:**
- Tugevam tuumik ja parem rüht
- Vähendatud seljavalu risk
- Parem keha stabiilsus
- Tugevamad õlalihasaded

**Tähtis märkus:**
Kvaliteet üle kvantiteedi - parem 15 sekundit õiges tehnikas kui 60 sekundit vales.',
  'Plank on kiire ja efektiivne viis tuumiku tugevdamiseks.',
  'Liikumine',
  'Steps',
  3,
  'kõrge',
  ARRAY['plank', 'tuumik', 'harjutus', 'rüht'],
  'Treener Margus Tsahkna',
  'Plank-harjutus tuumiku tugevdamiseks - õige tehnika ja progressioon algajatele.',
  true
),
(
  'sinise-valguse-moju-unele',
  'Sinine valgus ja une kvaliteet',
  'Ekraanide sinine valgus pärsib melatoniini tootmist ja häirib und. Lihtsa sammudega saab mõju vähendada.',
  '**Mis on sinine valgus?**

Sinine valgus on kõrge energiaga valgus (380-500nm), mida kiirgavad päike, LED-ekraanid ja nutiseadmed.

**Mõju unele:**
- Pärsib melatoniini (une hormooni) tootmist
- Nihutab kehakella 1-3 tundi hilisemaks
- Vähendab sügava une faasi
- Raskendab hommikul ärkamist

**Uuringu tulemused:**
2-tunnine ekraaniaeg enne und vähendas melatoniini tootmist 23% võrra ja lükkas unne jäämist 10 minuti võrra edasi.

**Kaitsemeetmed:**

**1. Seadete muutmine:**
- "Öörežiim" telefonides ja arvutites
- F.lux või Night Shift funktsiooni kasutamine
- Ekraani heleduse vähendamine õhtul

**2. Füüsilised filtrid:**
- Sinise valguse prillid (2h enne und)
- Ekraanifilter tahvlile/arvutile
- Punase valgusega lugemislamp

**3. Käitumise muutused:**
- Ekraanivaba aeg 1-2h enne und
- Lugemine paberilt või e-lugerist
- Meditsioon või lõõgastusharjutused

**4. Valguskeskkond:**
- Soojatoonilised lambid õhtul (<3000K)
- Hämardusgardina magamistoas
- Punane/oranž öövalgus

**Praktilised näpunäited:**
- Lae sinise valguse filteri rakendus
- Pane telefon õhtuks laadima teise tuppa
- Kasuta äratuse asemel traditsioonilist kellasid',
  'Sinise valguse mõju unele on oluline, kuid vähendatav.',
  'Magamine',
  'MythFact',
  4,
  'kõrge',
  ARRAY['sinine valgus', 'uni', 'melatoniin', 'ekraanid'],
  'Unemeditsiini keskus',
  'Kuidas sinine valgus mõjutab und ja kuidas ennast kaitsta ekraanide eest.',
  true
),
(
  'seljavalu-5-minutiga',
  'Seljavalu leevendamine 5 minutiga',
  '5-minutiline venitusjada aitab leevendada alakseljavalu ja pinget kontoripäeva järel.',
  '**Kiire abi alakseljavalu korral**

Need 5 harjutust aitavad lõõgastada pinges lihaseid ja parandada selgroo liikuvust.

**1. Põlvede kõhuni tõmbamine** (60 sek)
- Lama seljali, põlved kõhuni
- Käed põlvede ümber
- Kiigu õrnalt edasi-tagasi
- Hingamine sügav ja rahune

**2. Kassikõver** (60 sek)  
- Käed-põlvede asendis
- Selg ümar üles, siis lohku alla
- Aeglane ja kontrollitud liikumine
- 10-12 kordust

**3. Lapse-asend** (90 sek)
- Istu kandadele, käed ette sirutatud
- Pea põrandale, käed võimalikult kaugele
- Hingamine sügav
- Tunne seljalihaste venitust

**4. Piriformi lihase venitus** (60 sek/jalg)
- Seljali, parem põlv kõhul
- Parem hüppeluu vasaku käega endale poole
- Vaheta jalga
- Tunne tuharate venitet

**5. Selgroo pööramine** (60 sek)
- Seljali, käed külgedel
- Mõlemad põlved vasakule, pea paremale
- Hoia 30 sek, vaheta poolt
- Süügav hingamine

**Millal mitte teha:**
- Tugev, järsk valu
- Valu kirgub jalga
- Tuimus või nõrkus jalgades

**Lisanõuanded:**
- Tee iga päev sama ajal
- Soojakott enne harjutusi
- Kui valu püsib >1 nädal, arst juurde',
  'Lihtsa harjutused kiire leevenduse jaoks.',  
  'Seljavalu',
  'Steps',
  3,
  'keskmine',
  ARRAY['seljavalu', 'venitus', '5 minutit', 'leevendus'],
  'Füsioterapeut Ann Koppel',
  '5-minutiline venitusjada seljavalu leevendamiseks - kiire abi pinges lihastele.',
  true
),
(
  'dehudratsioon-ja-energia',
  '2% dehüdratsiooni mõju kehale',  
  'Juba 2% kehakaalust vee kaotus vähendab füüsilist ja vaimset võimekust märkimisväärselt.',
  '**Dehüdratsiooni varjatud mõjud**

Janusetunne tekib alles 2-3% dehüdratsioonil, kuid mõjud algavad palju varem.

**1% kehakaalust vee kaotus:**
- Keha temperatura tõus
- Südametöö kiirendamine
- Neerudeopterematsioonil häired

**2% kehakaalust vee kaotus:**
- Füüsiline võimekus langeb 15-20%
- Reaktsiooniaeg aeglustub
- Tähelepanu hajub
- Peavalu tekib

**Märgid dehüdratsioonist:**
- Tume uriin
- Kuiv suu
- Väsimus
- Peapööritus
- Nahuelastsuse vähenemine

**Riskigrupid:**
- Sportlased ja rasket tööd tegevad  
- Eakad (janusetunne väheneb)
- Lapsed (väike kehamass)
- Palaval kaemoel töötajad

**Optimaalse hüdratsiooni tagamine:**

**Hommikul:**
- 1-2 klaasi vett ärkamise järel
- Kontrolli urini värvi

**Päeva jooksul:**
- 250ml vett iga 2-3 tunni järel
- Lisa vett enne ja pärast treeningut
- Jälgi kehakaaldu treening eel ja järel

**Märkused:**
- Liigne vee joomine (>1L tunni jooksul) on ohtlik
- Elektrolüütide tasakaal on oluline
- Kohv ja alkohol ei loe vee hulka',
  'Dehüdratsiooni mõjud algavad varakult ja mõjutavad kogu organismi.',
  'Toitumine', 
  'MythFact',
  3,
  'kõrge',
  ARRAY['dehüdratsioon', 'vesi', 'energia', 'võimekus'],
  'Spordimeditsiin OÜ',
  'Kuidas 2% dehüdratsioon mõjutab keha võimekust - märgid ja ennetamine.',
  true
);