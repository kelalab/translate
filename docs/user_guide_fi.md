# TranslateGemma Käyttöopas

Tervetuloa TranslateGemman pariin! Tämä monipuolinen, täysin offline-tilassa toimiva käännössovellus mahdollistaa tekstien, asiakirjojen ja kuvissa olevan tekstin kääntämisen tehokkailla paikallisilla tekoälymalleilla – ilman että dataasi tarvitsee lähettää pilveen.

---

## 1. Sovelluksen Käyttöliittymä

Kun käynnistät ohjelman, näet kolme päävälilehteä: **Teksti (Text)**, **Asiakirjat (Documents)**, ja **Kuvat (Images)**.

- **Kieliasetukset (Language Settings)**: Käytä käyttöliittymän pudotusvalikoita valitaksesi Lähdekielen (Source) ja Kohdekielen (Target). Voit vierittää listaa tai käyttää hakukenttää löytääksesi haluamasi kielen nopeasti.
- **Käyttöliittymän kieli (UI Localization)**: Sovellusikkunan oikeasta yläkulmasta voit vaihtaa sovelluksen kieltä: `EN` (Englanti), `FI` (Suomi) tai `SV` (Ruotsi). Tämä päivittää välittömästi kaikki painikkeet ja valikot, ja järjestää listojen kielet automaattisesti aakkosjärjestykseen valitun kielen mukaisesti.

---

## 2. Tekstikäännös-tila (Text Translation Mode)

Käännä tavallisia tekstikappaleita välittömästi.

1. **Automaattinen tunnistus (Auto-Detect)**: Liitä (Paste) tekstiä suoraan vasemmanpuoleiseen laatikkoon. Odota hetki, niin TranslateGemma tunnistaa kielen automaattisesti (tunnistaen ranskasta japanin ja arabian kieliin) ja päivittää lähdekielen valikon!
2. **Oikealta vasemmalle (RTL)**: Jos kirjoitat tai liität oikealta vasemmalle kirjoitettavaa kieltä kuten arabiaa tai persiaa, tekstikenttä mukautuu automaattisesti lukusuunnan mukaiseksi.
3. **Käännä (Execute)**: Paina **"Käännä (Translate)"** -painiketta. Käännös tuotetaan oikeanpuoleiseen kenttään, josta voit vaivattomasti kopioida sen.
4. **Historia (History Drawer)**: Sovelluksen alaosasta voit avata "Käännöshistoria (Translation History)" -valikon selataksesi viimeistä 20 tekstikäännöstäsi.

---

## 3. Asiakirjakäännös-tila (Document Translation Mode)

Käännä laajoja ja monisivuisia tiedostoja sujuvasti kappale kerrallaan.

1. **Lataa asiakirja (Upload)**: Raahaa ja pudota tuettu tiedosto "Drag & Drop" -laatikkoon.
   - **Tuetut tiedostopäätteet:** `.txt`, `.docx` (Microsoft Word) ja `.pdf`.
2. **Käsittely ja kääntäminen (Processing)**: Sovellus avaa konsoli-ikkunan, josta voit seurata kääntämisen edistymistä reaaliajassa.
   - Huomio PDF-tiedostoista: Jos TranslateGemma tunnistaa skannatun PDF-tiedoston, joka ei sisällä digitaalista tekstiä, se turvautuu saumattomasti optiseen merkintunnistukseen (OCR) jokaista sivua kohden. *Tämä saattaa kestää pidempään tietokoneesi suorituskyvystä riippuen.*
3. **Tallenna (Save)**: Kun käännös saavuttaa 100%, näyttöön avautuu tallennusikkuna. Tekstitiedostot tallentuvat sellaisenaan, ja Word-asiakirjat säilyttävät alkuperäiset muotoilunsa!

---

## 4. Kuvakäännös-tila (Image Translation Mode / OCR)

Irrota ja käännä tekstiä suoraan kuvatiedostoista.

1. **Tuontitapa (Input method)**: Raahaa mikä tahansa kuvatiedosto kuvaruutuun, tai paina yksinkertaisesti `Ctrl+V` liittääksesi kuvan suoraan leikepöydältäsi (esim. ruutukaappaustyökalusta).
2. **Tunnistusmoottori (Extraction Engine)**: TranslateGemma käyttää sisäänrakennettuja malleja kuvan lukemiseen. Varmista, että valitset kuvan oikean kielen "Image Text Language" -valikosta, jotta sovellus käyttää kyseiselle kielelle tarkoitettua kuvantunnistuspakettia.
3. **Kääntäminen**: Tunnistettu teksti ilmestyy lähdetekstilaatikkoon. Voit tarvittaessa korjata sen sisältöä käsin ennen kuin ohjaat sen tekoälyn käännettäväksi.

---

## 5. Eksperttitoiminnot: Ulkoiset API-rajapinnat

Voit ohjata käännöspyyntösi myös mukautetuille ulkoisille palvelimille laitteen sisäänrakennetun *TranslateGemma 4B* -mallin sijaista.

### Asetukset-valikon avaaminen
Nähdäksesi piilotetun API-hammasrataskuvakkeen "Built-in" LLM -pudotusvalikon vieressä, käynnistä sovellus asettamalla sille asianmukainen lippu (flag). Esimerkiksi terminaalista tai pikakuvakkeen kautta:
`npm start -- --enable-external-api` (tai `--advanced-api`)

### Palveluntarjoajien hallinta (Managing Providers)
1. Napsauta **Rataskuvaketta (⚙)** avataksesi API-palveluntarjoajien asetukset.
2. Ohjelma tukee itsessään **Paikallista Ollamaa (Local Ollama)** (automaattisesti tunnistaen portit 11434).
3. Lisätäksesi mukautetun palvelimen (kuten OpenAIn tai etäpalvelimen Ngrokin yli), täytä seuraavat tiedot:
   - **Nimi (Name)**: Lempinimi palvelimelle, joka näkyy valikossa.
   - **Päätepisteen URL (Endpoint URL)**: Tarkka REST API-osoite (esim. `http://remote-server:11434/v1`).
   - **API-avain (API Key)**: Jos rajapinta sen vaatii.
   - **Sallitut mallit (Whitelist Models)**: (Valinnainen). Pilkulla erotettu lista malleista, jotka haluat tuoda valikkoon pitääksesi sen siistinä (esim. `llama3, gemma, mistral`).
4. Sulje tämä asetusikkuna ja mukautetut mallisi ilmestyvät välittömästi päävalikkoon valittavaksesi!
