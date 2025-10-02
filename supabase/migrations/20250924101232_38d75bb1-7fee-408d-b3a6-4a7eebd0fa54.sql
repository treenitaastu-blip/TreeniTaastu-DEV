-- Add sample articles with real content
INSERT INTO articles (
  slug, title, summary, content, excerpt, category, format, 
  read_time_minutes, evidence_strength, tags, author, 
  meta_description, published
) VALUES 
(
  'vee-joomine-ja-metabolism',
  'Kuidas vee joomine kiirendab metabolismi',
  'Piisav vee tarbimine võib tõsta ainevahetust kuni 30% võrra ja aidata kaalu langetamisel.',
  'Vesi on meie keha kõige olulisem aine. Uuringud näitavad, et 500ml vee joomine võib tõsta ainevahetust 10-30% võrra järgneva 30-40 minuti jooksul.

Kuidas vesi metabolismi mõjutab:

• **Termoregulatsioon** - Keha kulutab energiat vee soojendamiseks keha temperatuurini
• **Rakufunktsioonid** - Kõik ainevahetuprotsessid vajavad vett toimumiseks  
• **Toksiinide väljutamine** - Vesi aitab kahjulikke aineid kehast välja viia
• **Näljaäratundmine** - Sageli segi aetakse janu ja näljatunnet

Soovitused:
- Joo 8-10 klaasi vett päevas
- Alusta päeva klaasi veega
- Joo vett enne söömist
- Lisa vette sidrunilõiku maitse jaoks

Märkused:
Liigne vee joomine võib olla kahjulik. Kuula oma keha signaalide.',
  'Uuring näitab, et vee joomine tõstab ainevahetust märkimisväärselt.',
  'Toitumine',
  'TLDR',
  3,
  'kõrge',
  ARRAY['vesi', 'metabolism', 'kaalulangetus'],
  'Dr. Mari Kask',
  'Kuidas vee joomine kiirendab metabolismi ja aitab kaalu langetada - teaduspõhised soovitused.',
  true
),
(
  'magamise-kvaliteet-ja-tervis',
  'Kvaliteetse une 7 reeglid',
  'Head uneharjumused parandavad mälu, immuunsust ja vaimset tervist ning pikendavad eluiga.',
  '**Miks on uni oluline?**

Une ajal toimuvad kehas olulised taastumis- ja puhastusprotsessid. Aju puhastab end toksiinidest, lihased taastuvad ja mälu konsolideerub.

**7 kvaliteetse une reeglit:**

1. **Regulaarne unerütm**
   Minge magama ja ärgake igal päeval samal ajal, ka nädalavahetustel.

2. **Optimaalne magamistoa keskkond**
   - Temperatuur 16-19°C
   - Pimedus (kasutage kardinaid või silmamask)
   - Vaikus või valge müra

3. **Ekraanide vältimine**
   Lõpetage ekraanide kasutamine 1-2 tundi enne magamaminekut.

4. **Päikesvalgus hommikul**
   15-30 minutit päikesvalgust hommikul reguleerib tsirkaadset rütmi.

5. **Kohvi piiramine**
   Viimane kohvitass mitte hiljem kui 6 tundi enne magamaminekut.

6. **Õhtune rutiin**
   Looge rahulik õhtune rutiin - lugemine, meditsioon või kergvenitus.

7. **Liikumine, kuid mitte hilja**
   Regulaarne liikumine parandab une kvaliteeti, kuid mitte 3 tundi enne magamaminekut.',
  'Kvaliteetne uni on tervislik elustiili alustala.',
  'Magamine',
  'Steps',
  5,
  'kõrge',
  ARRAY['uni', 'tervis', 'energia'],
  'Dr. Peep Laanoja',
  'Kvaliteetse une 7 reeglil - teaduspõhised nõuanded parema une saamiseks.',
  true
),
(
  'tooli-ergonoomika-kontoris',
  'Kuidas istuda tervislikult kontoris',
  'Õige istumisasend ja regulaarsed pausid vähendavad selja- ja kaelavalusid ning parandavad produktiivsust.',
  'Kontoris istumisega kaasnevad terviseriskid on reaalsed, kuid neid saab lihtsate muudatustega vähendada.

**Õige istumisasend:**

• **Jalad** - mõlemad jalad maas, põlved 90° nurga all
• **Selg** - sirge, õlad lõdvad  
• **Käed** - küünarnukid 90° nurga all, randmed neutraalasendis
• **Ekraan** - silmade kõrgusel, käsivarre kaugusel

**Regulaarsed pausid:**
- Iga 30 minuti järel 30-sekundiline paus
- Iga tunni järel 5-minutiline kõndimine
- Kasutage "20-20-20 reeglit": iga 20 minuti järel vaata 20 sekundi jooksul 20 meetri kaugusele

**Töökeskkonna optimeerimine:**
- Reguleeritav tool ja laud
- Hea valgustus (vältida ekraani peegeldust)
- Dokumentide alus ekraani kõrval
- Klaviatuur ja hiir õigel kõrgusel

**Liikumise integreerimine:**
- Seisulaud osa päevast
- Telefonikõned jalutades
- Trepid lifti asemel
- Kaugemale parkimine

**Hoiatused:**
Kui valu püsib rohkem kui nädalas, konsulteeri arstiga.',
  'Õige kontorikeskkond ennetab terviseprobleeme.',
  'Tööergonoomika',
  'Steps',
  4,
  'kõrge',
  ARRAY['ergonoomika', 'kontor', 'seljavalu'],
  'Ergonoomika Keskus',
  'Kuidas istuda tervislikult kontoris - praktilised nõuanded õigeks töökeskkonnaks.',
  true
),
(
  'lihasmassi-kaitse-vanusega',
  'Miks me kaotame lihast vanusega',
  'Pärast 30. eluaastat kaotame aastas 3-8% lihasmassist. Õige trenn ja toitumine aitavad seda protsessi aeglustada.',
  '**Sarkopenia - vältimatu protsess?**

Lihasmassi vähenemine vanusega (sarkopenia) algab juba 30. eluaastatel. See pole vältimatu saatus - õige lähenemisega saab seda märkimisväärselt aeglustada.

**Miks see toimub:**
- Valkude süntees väheneb
- Anaboolsete hormoonide tase langeb  
- Füüsiline aktiivsus väheneb
- Toitumine muutub ebapiisavaks

**Tagajärjed:**
- Nõrgem jõud ja vastupidavus
- Suurem vigastuste risk
- Aeglasem metabolism
- Halvem elukvaliteet

**Kuidas seda ennetada:**

1. **Jõutreening**
   - 2-3 korda nädalas
   - Kõik suured lihasgrupid
   - Progressiivne üleraskus

2. **Piisav valk**
   - 1,2-1,6g/kg kehakaalust päevas
   - Jaotada ühtlaselt päeva peale
   - Kvaliteetsed valguallikad

3. **Aktiivsus**
   - Igapäevane liikumine
   - Vältige pikka istumist
   - Märkige samme ja aktiivsust

**Oluline märkus:**
Alustage aeglaselt ja konsulteerige arstiga enne intensiivse treeningu alustamist, eriti kui teil on tervisprobleeme.',
  'Lihasmassi kaitsmine on võimalik õige lähenemisega.',
  'Lihasmassi vähenemine',
  'MythFact',
  4,
  'kõrge',
  ARRAY['sarkopenia', 'jõutreening', 'vananemine'],
  'Spordimeditsiin OÜ',
  'Miks me kaotame lihast vanusega ja kuidas seda ennetada - teaduspõhised lahendused.',
  true
),
(
  'stress-ja-seedekulgla',
  'Kuidas stress mõjutab seedimist',
  'Kroniline stress häirib seedetrakti tööd, põhjustades kõhuvalu, ülekülma ja muid seedeprobleeme.',
  '**Stress-seedetrakti seos**

Meie sool ja aju on tihedalt seotud närvisüsteemi kaudu. See tähendab, et stress mõjutab otseselt seedimist.

**Stressi mõju seedimisele:**

• **Seedenõgre vähenemine** - Stress vähendab mao- ja kõhunäärme mahlade tootmist
• **Liikuvuse muutused** - Sool võib liiga kiiresti või aeglaselt töötada
• **Mikroflora häirumine** - Kahjulike bakterite kasv, kasulike vähenemine
• **Läbilaskvuse suurenemine** - "Lekkiv sool" võimaldab toksiinidel verre pääseda

**Sümptomid:**
- Kõhuvalu või -ebamugavus
- Kõhulahtisus või kõhukinnisus
- Ülekülm ja tuulsusvalu
- Sügatistega probleemid

**Leevendamise viisid:**

1. **Stressijuhtimine**
   - Meditsioon ja hingamisharjutused
   - Regulaarne uni ja puhkus
   - Füüsiline aktiivsus

2. **Toitumine**
   - Korrapärased söögid
   - Kiudainerikad toidud
   - Probiotikumide lisamine
   - Alkoholi ja kofeini piiramine

3. **Eluviis**
   - Söögiaegne keskendumine toidule
   - Aeglane söömine ja põhjalik närimine
   - Piisav vee joomine

**Millal arsti juurde:**
Kui sümptomid kestavad üle 2 nädala või halvenevad.',
  'Stress ja seedimisprobleemid on omavahel seotud.',
  'Stress',
  'TLDR',
  3,
  'keskmine',
  ARRAY['stress', 'seedimisprobleemid', 'kõht'],
  'Toitumisnõustaja Eve Parts',
  'Kuidas stress mõjutab seedimist ja milliseid samme teha seedeprobleemide leevendamiseks.',
  true
),
(
  'kaelavalu-ennetamine-kodus',
  'Kaelavalu ennetamine kodus töötades',
  'Lihtsa harjutuste ja töökeskkonna muutustega saab vähendada kaelavalude tekkimist kaugtöö ajal.',
  '**Kaugtöö ja kaelavalu**

COVID-19 pandeemia järel on kaugtöö muutunud tavaliseks, kuid kahjuks on suurenenud ka kaela- ja õlavalude esinemine.

**Peamised põhjused:**
- Vale monitor või sülearvuti asukoht
- Ebasobiv tool või laud
- Pikaaegne sama asendis püsimine
- Stress ja pingetunne

**Kiired lahendused:**

**1. Töökeskkond**
- Ekraan silmade kõrgusel
- Välisklaviatuur sülearvutile
- Dokumendibaar ekraani kõrval
- Piisav valgus

**2. Regulaarsed pausid**
Tee iga 30 minuti järel:
- 10 kaela pööramist mõlemas suunas
- Õlgade kergtamine ja langetamine
- Lõualihaste venitamine

**3. Venimisharjutused (3x päevas):**

*Kaela külgvenitus:*
- Pea kallutamine küljele
- Hoid 20 sekundit
- Korda mõlemas suunas

*Lõua tõmbamine:*
- Loo "topeltlõug"
- Hoid 5 sekundit
- Korda 10 korda

*Õlgade rullutamine:*
- Suured ringid tagapoole
- 10 korda

**Millal muret tunda:**
Kui valu kiirgub kätte, on tugev peavalu või tuimus, konsulteeri arstiga.',
  'Kaelavalu on kaugtöö ajal sage probleem.',
  'Kaelavalu',
  'Steps',
  4,
  'keskmine',
  ARRAY['kaelavalu', 'kaugtöö', 'ergonoomika'],
  'Füsioterapeut Margo Raud',
  'Kuidas ennetada kaelavalusid kodus töötades - praktilised harjutused ja nõuanded.',
  true
);