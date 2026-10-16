from fpdf import FPDF

class PDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(100,100,100)
        self.cell(0, 8, "Hackathon Project Ideas - Hacktoberfest 2026", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(100,100,100)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")

    def section_title(self, title):
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(30, 80, 160)
        self.ln(4)
        self.multi_cell(0, 8, title)
        self.set_draw_color(30, 80, 160)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(3)

    def sub_title(self, title):
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(40,40,40)
        self.ln(2)
        self.multi_cell(0, 7, title)
        self.ln(1)

    def body(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30,30,30)
        self.multi_cell(0, 6, text)
        self.ln(1)

    def bullet(self, bold_part, rest):
        x = self.get_x()
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30,30,30)
        self.cell(5, 6, "-")
        if bold_part:
            self.set_font("Helvetica", "B", 10)
            self.write(6, bold_part + " ")
        self.set_font("Helvetica", "", 10)
        self.multi_cell(0, 6, rest)
        self.ln(0.5)

pdf = PDF()
pdf.alias_nb_pages()
pdf.set_auto_page_break(auto=True, margin=20)
pdf.add_page()

# Cover
pdf.set_font("Helvetica", "B", 22)
pdf.set_text_color(20, 60, 140)
pdf.ln(15)
pdf.multi_cell(0, 11, "Hackathon Project Ideas\nTargeted Real-Life Solutions", align="C")
pdf.ln(5)
pdf.set_font("Helvetica", "", 12)
pdf.set_text_color(60,60,60)
pdf.multi_cell(0, 7, "Hacktoberfest 2026 - 3 Prize Categories", align="C")
pdf.ln(5)
pdf.set_font("Helvetica", "I", 10)
pdf.multi_cell(0, 6, "1. Best Use of Gemma 4 (DeepMind Google)\n2. Best Open-Source AI Project (DigitalOcean)\n3. Best Use of Adaption AI (Event Prize)", align="C")
pdf.ln(10)
pdf.set_font("Helvetica", "", 10)
pdf.set_text_color(80,80,80)
pdf.multi_cell(0, 6, "Prepared: October 16, 2026\nFocus: Buildable in 24-48h, high social impact, eligible for multiple categories.", align="C")

# Categories overview
pdf.add_page()
pdf.section_title("1. Prize Categories Overview")
pdf.sub_title("A. Best Use of Gemma 4 - DeepMind Google")
pdf.body("Lightweight, open model with multimodal intelligence via Gemini API. Gemma 4 family: E2B/E4B (mobile/IoT edge), 12B (laptop-ready, native audio + vision, encoder-free), 26B MoE A4B and 31B (workstation). Features: text + image + audio input, text output, 256K context, 140+ languages, thinking mode for reasoning, agentic workflows, Apache 2.0 license. Runs on 16GB RAM laptops, phones. Ideal for offline, privacy-preserving, low-resource apps.")
pdf.sub_title("B. Best Open-Source AI Project - DigitalOcean")
pdf.body("Build an original project that uses open-source or open-weight AI as an important part of how it works. 2026 theme: 'AI belongs to everyone'. Expected artifacts: skills.md, open-source agent, fine-tune an open-weight model. Deploy on DigitalOcean Gradient (GPU), App Platform, Droplets, Storage. Rewards: Exclusive Hacktoberfest 2026 Winner DEV Badge + MLH Swag Bag.")
pdf.sub_title("C. Best Use of Adaption AI - Event Prize")
pdf.body("Build innovative AI-powered solution using Adaption AI. Platform: Adaptive Data + AutoScientist. Adaptive Data: optimize, expand, invent training datasets across 242 languages, from CSV/JSON/PDF/DOCX/HuggingFace/Kaggle. Forge turns unstructured docs into training data. Blueprint controls length/tone/safety. AutoScientist co-optimizes data + training recipe automatically. SDK: pip install adaption. 82% average quality gains reported.")

pdf.section_title("2. Winning Strategy: Triple-Dip")
pdf.body("Do NOT build 3 separate projects. Build ONE project eligible for all 3:\n\n1. Core = Gemma 4 12B via Gemini API + Ollama local fallback (satisfies Gemma 4)\n2. Open-source = MIT repo with skills.md agent + HuggingFace dataset/model + DigitalOcean Gradient deploy (satisfies DigitalOcean)\n3. Customization = Use Adaption Adaptive Data to invent/adapt dataset for local language/domain, show before/after win-rate, loss, quality (satisfies Adaption AI)\n\nDemo script: Show offline mode + local language + Adaption quality comparison.")

ideas = [
    ("Project 1: ClinicOffline - Rural Health Triage [Best for Gemma 4]",
     "Clinics with no internet / no doctor cannot interpret prescriptions, rashes, lab slips.",
     "Mobile-first PWA running Gemma 4 E4B/12B on-device. Input: photo of skin condition / prescription / lab slip + voice symptom. Output: triage level, referral urgency, plain-language explanation in local language. Thinking mode for step-by-step reasoning. No data leaves phone.",
     ["Offline + privacy: runs on cheap Android, 16GB RAM", "Multimodal: vision + audio natively", "Multilingual: 140+ languages", "Stack: Gemma 4 E4B, LiteRT / Ollama, React PWA, Gemini API"],
     "Gemma edge story judges love. High impact."),
    ("Project 2: AgriLingua - Crop Doctor for Smallholder Farmers [Gemma 4 + Adaption]",
     "Extension workers scarce. Crop disease advice not available in Hausa, Swahili, Yoruba, Hindi.",
     "Farmer snaps diseased leaf + 10s voice note. Gemma 4 12B vision + audio -> diagnosis + organic/chemical treatment in local language + audio playback. Use Adaption Invent + Expand to generate data where none exists.",
     ["Adaption Adaptive Data: invent dataset for local crops, translate/localize", "Gemma 4 12B: unified encoder-free vision/audio", "Open-source skill: crop-doctor skills.md", "Deploy: DigitalOcean App Platform + Storage for images"],
     "Perfect Gemma + Adaption combo. Very strong live demo."),
    ("Project 3: LearnInMyTongue - Textbook to Local Lessons [Best for Adaption AI]",
     "Students fail due to language, not intelligence. Textbooks stuck as English PDFs.",
     "Upload PDF/DOCX/PPTX -> Adaption Forge extracts/structures -> Blueprint sets tone/length/safety -> instruction dataset + preference pairs -> fine-tune via Together Fine-Tuning / AutoScientist OR prompt Gemma 4 256K context for quizzes, summaries, audio lessons.",
     ["Literal Adaption use case: unstructured docs to training data", "256K context: ingest whole textbook", "Multilingual: 242 languages (Adaption) + 140 (Gemma)", "Export: HuggingFace dataset + model"],
     "Strongest fit for Adaption prize."),
    ("Project 4: ShopBooks - Receipt-to-Books for SMEs [Best for DigitalOcean]",
     "Small shops use paper, cannot track profit, tax, or qualify for loans.",
     "Photo of receipts/invoices/handwritten ledger -> Gemma 4 doc understanding (OmniDocBench SOTA) -> sales table, profit, low-stock alert, WhatsApp-style summary. Open agent with bookkeeping skills.md.",
     ["Gemma multimodal doc parsing", "DigitalOcean Gradient + Postgres + App Platform", "Open-source agent + skills.md", "Future: Adaption Blueprint for financial tone/safety"],
     "Business value clear. Easy MVP in hackathon."),
    ("Project 5: CivicCheck - Misinformation Checker [Best for Open-Source]",
     "Viral WhatsApp screenshots spread health/election rumors.",
     "Paste screenshot + claim -> Gemma 4 fact-check agent explains verdict simply, with sources. Publish reusable skills.md + dataset on HuggingFace. Host on DigitalOcean.",
     ["2026 theme match: 'write your first skills.md'", "Fully open-source repo, model, data", "Agent + function calling (Tau2 benchmark strength)", "Low compute, high demo impact"],
     "What MLH/DEV want this year."),
    ("Project 6: HearMe - Accessibility Captions",
     "Deaf / low-literacy users locked out of audio/visual content.",
     "Gemma 4 E2B on-device: live audio -> captions + simplified visuals; image -> spoken local-language description. Works offline, no cloud cost.",
     ["Edge AI: E2B maximum efficiency", "Native audio input (E2B/E4B/12B)", "Social impact + inclusion story", "Stack: Gemma Edge Gallery, LiteRT, Android"],
     "Impact prize potential."),
]

pdf.section_title("3. Six Project Ideas - Detailed")
for title, problem, build, bullets, why in ideas:
    pdf.sub_title(title)
    pdf.bullet("Problem:", problem)
    pdf.bullet("Build:", build)
    for b in bullets:
        pdf.bullet("", b)
    pdf.bullet("Why it wins:", why)

pdf.section_title("4. Recommended MVP Scope (24-48h)")
pdf.body("Pick ONE idea (AgriLingua or LearnInMyTongue recommended). MVP must include:\n\nDay 1: Gemma 4 chat + image/audio upload working via Gemini API, basic UI, deploy to DigitalOcean App Platform\nDay 2: Add skills.md open-source agent file, run ONE Adaption Adaptive Data job (import 50-100 rows -> adapt -> export), show before/after quality screenshot, record 2-min demo in local language + offline mode\n\nMust-haves for judging: live link, GitHub README with architecture diagram, DEV post, 90-sec video, Adaption run ID/screenshot, DO deploy URL.")

pdf.section_title("5. Tech Checklist")
pdf.body("Gemma 4: Google AI Studio / Gemini API, Ollama (gemma3 / gemma4), LM Studio, HuggingFace weights, Kaggle\nAdaption: pip install adaption, ADAPTION_API_KEY, Adaptive Data quickstart, AutoScientist quickstart\nDigitalOcean: Gradient GPU, App Platform, Droplets, Spaces Storage, Postgres\nCommon: Python FastAPI + React/Vite PWA, Tailwind, HuggingFace Hub, DEV Challenge post")

pdf.set_font("Helvetica", "I", 10)
pdf.set_text_color(80,80,80)
pdf.ln(5)
pdf.multi_cell(0, 6, "Next: Choose 1 idea, confirm team size, stack (Python/React?), target language/domain, and I will generate architecture + task list + starter code.")

out = r"C:\Users\MUSTAPHA\Documents\hacktoberfest\Hackathon_Project_Ideas_2026.pdf"
pdf.output(out)
print(f"Saved to {out}")
