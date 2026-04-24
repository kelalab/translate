# TranslateGemma Användarguide

Välkommen till TranslateGemma! Denna mångsidiga översättningsapplikation fungerar helt offline och gör det möjligt att översätta texter, läsa dokument och extrahera text från bilder. Allt drivs av kraftfulla lokala AI-modeller utan att din data någonsin skickas till molnet.

---

## 1. Navigera i Applikationen

När du startar applikationen möts du av fyra huvudflikar: **Text**, **Dokument (Documents)**, **Bilder (Images)**, och **Tal (Speech)**.

- **Språkinställningar (Language Settings)**: Använd rullgardinsmenyerna högst upp på skärmen för att välja ditt Källspråk (Source) och ditt Målspråk (Target). Du kan antingen rulla i listan eller söka för att hitta precis rätt språk.
- **Gränssnittsspråk (UI Localization)**: I appfönstrets övre högra hörn kan du byta gränssnittsspråk mellan `EN` (Engelska), `FI` (Finska) och `SV` (Svenska). Finessen här är att byta språk inte bara ändrar texten på knapparna, utan även dynamiskt sorterar om rullgardinsmenyernas språkalternativ i alfabetisk ordning anpassat till det valda språket!

---

## 2. Textöversättningsläge (Text Translation Mode)

Översätt vanliga textstycken snabbt och enkelt.

1. **Automatisk Identifiering (Auto-Detect)**: Klistra in text direkt i den vänstra källtextrutan. Vänta en kort sekund, så kommer TranslateGemma automatiskt att identifiera språket (oavsett om det är franska, japanska eller arabiska) och uppdaterar källspråksmenyn!
2. **Höger-till-vänster (RTL)**: Om du skriver eller klistrar in RTL-språk som arabiska eller persiska, justeras högerinriktningen på textrutan automatiskt för att göra det bekvämt.
3. **Kör Översättning (Execute)**: Klicka på **"Översätt"**. Den översatta texten kommer att streamas fram snabbt i den högra rutan. Du kan kopiera den genom att trycka på knappen "Kopiera" nere till höger.
4. **Historikfliken (History Drawer)**: Utöka "Översättningshistorik" längst ner i appen för att granska dina 20 senaste textöversättningar. Notera: Historikfliken döljs automatiskt i flikarna för Tal och Dokument för att spara utrymme.

---

## 3. Dokumentöversättningsläge (Document Translation Mode)

Översätt stora, flersidiga dokument lokalt, stycke för stycke.

1. **Ladda upp Dokument (Upload)**: Dra och släpp ett kompatibelt filformat i rutan "Dra och släpp" (Drag & Drop).
   - **Typer som stöds:** `.txt`, `.docx` (Microsoft Word) och `.pdf`.
2. **Bearbetningsfasen (Processing)**: Appen öppnar ett integrerat konsolfönster som visar dig översättningsprocessen i realtid.
   - *Notering gällande PDF:* Om TranslateGemma upptäcker en inskannad PDF utan digital text, övergår systemet smidigt till optisk teckenigenkänning (OCR) för att visuellt skanna av varje sida. *Avhängigt av din dators prestanda kan detta ta betydligt längre tid.*
3. **Spara filen (Save)**: När skanningen uppnår 100% dyker fönstret Spara Fil upp. Textdokument sparas som vanlig ren text och Word-dokument rekonstrueras i avsikt att behålla filens ursprungliga teckensnitt och formatering!

---

## 4. Bildöversättningsläge (Image Translation Mode / OCR)

Extrahera text som är inkapslad direkt i bildfiler och översätt den.

1. **Insättningsmetod (Input Method)**: Dra in en bildfil i bildrutan, eller tryck bara `Ctrl+V` för att klistra in en bild direkt från ditt urklipp (t.ex. från ett skärmklippsverktyg).
2. **Extraheringsmotor (Extraction Engine)**: Se till att du väljer det korrekta ursprungsspråket som texten på bilden är skriven i (Image Text Language). Därigenom vet systemet exakt vilket visuellt alfabet och lokalt filpaket den bör hämta.
3. **Översättning**: Texten fastställs och dyker sedan upp i källtextrutan. Gör de rättelser som faller dig in, och därefter kan du klicka "Översätt" för att processera resultatet genom AI:t.

---

## 5. Talöversättningsläge (Experimentell / Experimental)

Kommunicera i realtid med hjälp av lokal tal-till-tal AI.

1. **Inställningar**: Välj **"Ditt språk"** (t.ex. svenska) och **"Kundens språk"** (t.ex. arabiska).
2. **Interaktion**:
   - Håll inne knappen **"Du"** medan du talar. Appen transkriberar ditt tal, översätter det och läser upp översättningen direkt.
   - Håll inne knappen **"Kund"** när den andra personen talar. Appen översätter talet tillbaka till ditt språk och visar det på skärmen.
3. **Talsyntes (TTS)**: Piper- och Sherpa-motorerna levererar snabb offline-röst. För mindre språk som somaliska eller albanska är talsyntesen för närvarande experimentell och kräver specifika modellnedladdningar.
4. **LLM-krav**: För komplexa språk (t.ex. somaliska), se till att du använder en tillräckligt stor LLM (som Gemma 9B via Ollama) för att säkerställa korrekt textöversättning innan talet genereras.

---

## 6. Avancerade Funktioner: Externa API-anslutningar

Denna finess tillåter mer insatta användare att dirigera översättningsförfrågningar genom avlägsna servrar istället för via den inbyggda AI-motorn *TranslateGemma 4B*.

### Avancera till Åtkomstmenyn (Unlocking the Settings Menu)
Om du vill kunna se den dolda kuggjulsknappen, måste du starta appen med en avancerad flagga inskriven via terminal/genväg:
`npm start -- --enable-external-api` (oder `--advanced-api`)

### Hantera Leverantörer (Managing Providers)
1. Klicka på **Kugghjulet (⚙)** för att öppna modalen för API-Providers.
2. Enheten har ett inbyggt system just avsett för att plocka upp **Lokal Ollama** (som letar sig fram till standardportar runt 11434).
3. För ytterligare inlägg (såsom OpenAI:s URL-tjänst eller en server ansluten via Ngrok), v.g. fylla i formen:
   - **Namn (Name)**: Serverns smeknamn, skräddarsy ditt alternativ så rullgardinsmenyn blir lättläslig.
   - **Slutpunkts-URL (Endpoint URL)**: REST-adressen (exempelvis `http://remote-server:11434/v1`).
   - **API-nyckel (API Key)**: Fyll i detta om API-grindarna är låsta.
   - **Tillåtna modeller (Whitelist Models)**: Detta valfria fält är en kommaseparerad lista. Fyll i namnen på de specifika modellerna du enbart menar att visa upp i UI-rutan (exempelvis, `llama3, gemma, mistral`).
4. Stäng fönstret - appen loggar avtalen i gränssnittet genast och möjliggör sedan skräddarsydd routing.
