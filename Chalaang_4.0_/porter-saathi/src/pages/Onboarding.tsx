// src/pages/Onboarding.tsx
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import {
  Box, Paper, Stack, Typography, TextField, Button, Stepper, Step, StepLabel
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useSpeech } from "../hooks/useSpeech";
import VoiceBar from "../components/VoiceBar";

const steps = [
  { key: "name",  label: "Full Name",   prompt: "कृपया अपना पूरा नाम बताइए।" },
  { key: "phone", label: "Phone Number",prompt: "अपना मोबाइल नंबर बोलिए। दस अंकों का।" },
  { key: "pan",   label: "PAN Number",  prompt: "अपना पैन नंबर बताइए। दस अक्षर—जैसे A B C D E 1 2 3 4 F." },
  { key: "bank",  label: "Bank Account",prompt: "अपना बैंक अकाउंट नंबर बोलिए।" },
] as const;
type StepKey = (typeof steps)[number]["key"];
type FormData = { [K in StepKey]?: string };

// --- Helpers: digits & commands ------------------------------------------------
const DEV2LAT: Record<string, string> = { "०":"0","१":"1","२":"2","३":"3","४":"4","५":"5","६":"6","७":"7","८":"8","९":"9" };
const WORD2DIG: Record<string, string> = {
  // Hindi
  "शून्य":"0","सिफर":"0","ज़ीरो":"0","जीरो":"0",
  "एक":"1","दो":"2","तीन":"3","चार":"4","पाँच":"5","पांच":"5","छः":"6","छह":"6","सात":"7","आठ":"8","नौ":"9",
  // English
  "zero":"0","one":"1","two":"2","three":"3","four":"4","five":"5","six":"6","seven":"7","eight":"8","nine":"9",
};

function toLatinDigits(s: string) {
  return s.replace(/[०-९]/g, (ch) => DEV2LAT[ch] ?? ch);
}

function wordsToDigits(s: string) {
  // Replace standalone number-words with digits
  return s.replace(/\b([a-zA-Z\u0900-\u097F]+)\b/gi, (w) => WORD2DIG[w.toLowerCase()] ?? w);
}

function onlyDigits(s: string) {
  return s.replace(/\D+/g, "");
}

function normalizeCmd(s: string) {
  const t = s.normalize("NFC").toLowerCase().trim();
  // Map common commands to canonical tokens
  if (/(next|aage|आगे|आग[ेे])/.test(t)) return "next";
  if (/(back|peeche|पीछे|वापस)/.test(t)) return "back";
  if (/(repeat|dobara|दोहराइए|फिर से|फिरसे)/.test(t)) return "repeat";
  if (/(submit|finish|done|पूर्ण|समाप्त|खत्म|सबमिट)/.test(t)) return "submit";
  return "";
}

export default function Onboarding() {
  const [active, setActive] = useState(0);
  const [data, setData] = useState<FormData>({});
  const [error, setError] = useState<string>("");
  const { listening, start, stop, lastTranscript, speak } = useSpeech({ lang: "hi-IN" });

  const cur = steps[active];

  // Speak current prompt when the step changes
  useEffect(() => {
    speak(cur.prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Handle manual input
  const setField = (key: StepKey, val: string) => setData((d) => ({ ...d, [key]: val }));

  // Validate & accept field values (spoken or typed)
  function acceptValue(key: StepKey, raw: string) {
    setError("");

    if (key === "name") {
      const v = raw.trim();
      if (v.length < 2) {
        setError("नाम छोटा है, कृपया स्पष्ट बोलिए।");
        speak("नाम छोटा है, कृपया स्पष्ट बोलिए।");
        return false;
      }
      setField("name", v);
      speak(`ठीक है, ${v}.`);
      return true;
    }

    if (key === "phone") {
      // normalize any Hindi digits and number-words
      const norm = onlyDigits(toLatinDigits(wordsToDigits(raw)));
      if (norm.length !== 10) {
        setError("मोबाइल नंबर ठीक नहीं है। 10 अंकों का नंबर बोलिए।");
        speak("मोबाइल नंबर ठीक नहीं है। 10 अंकों का नंबर बोलिए।");
        return false;
      }
      setField("phone", norm);
      speak(`ठीक है, आख़िरी चार अंक ${norm.slice(-4)}।`);
      return true;
    }

    if (key === "pan") {
      // join spaced letters/digits, uppercase, keep only A-Z0-9
      const joined = raw.replace(/\s+/g, "");
      const cleaned = joined.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(cleaned)) {
        setError("पैन नंबर मान्य नहीं है। फिर से स्पष्ट बोलिए—जैसे A B C D E 1 2 3 4 F.");
        speak("पैन नंबर मान्य नहीं है। फिर से बोलिए।");
        return false;
      }
      setField("pan", cleaned);
      speak("ठीक है, पैन नंबर मिल गया।");
      return true;
    }

    if (key === "bank") {
      const digits = onlyDigits(toLatinDigits(wordsToDigits(raw)));
      if (digits.length < 9 || digits.length > 18) {
        setError("अकाउंट नंबर स्पष्ट नहीं है। 9 से 18 अंकों का नंबर बोलिए।");
        speak("अकाउंट नंबर स्पष्ट नहीं है। फिर से बोलिए।");
        return false;
      }
      setField("bank", digits);
      speak(`ठीक है, आख़िरी चार ${digits.slice(-4)}।`);
      return true;
    }

    return false;
  }

  // Use voice transcript
  useEffect(() => {
    if (!lastTranscript) return;

    const cmd = normalizeCmd(lastTranscript);
    if (cmd === "repeat") {
      speak(cur.prompt);
      return;
    }
    if (cmd === "back") {
      if (active > 0) setActive((i) => i - 1);
      else speak("पहले से ही पहला चरण है।");
      return;
    }
    if (cmd === "next") {
      // try accepting empty advance only if current is already filled
      if (data[cur.key]) setActive((i) => Math.min(i + 1, steps.length - 1));
      else {
        speak("पहले इस चरण का उत्तर दीजिए।");
      }
      return;
    }
    if (cmd === "submit") {
      if (Object.keys(data).length < steps.length) {
        speak("कुछ जानकारी अधूरी है। पहले सभी चरण पूरे करें।");
        return;
      }
      submit();
      return;
    }

    // treat as value for current field
    const ok = acceptValue(cur.key, lastTranscript.trim());
    if (ok) {
      // auto-advance
      if (active < steps.length - 1) setActive((i) => i + 1);
      else speak("धन्यवाद। फ़ॉर्म तैयार है। सबमिट करें।");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastTranscript]);

  const submit = () => {
    // Normally send to API; here we just read back a short summary
    speak("ऑनबोर्डिंग फ़ॉर्म सबमिट हो गया। धन्यवाद।");
  };

  // UI -------------------------------------------------------------------------
  return (
    <Box sx={{ bgcolor: "background.default" }}>
      <Container maxWidth="xl" sx={{ py: { xs: 6, md: 8 } }}>
        <Stack spacing={3}>
          <Typography variant="h4" fontWeight={900}>Voice-Led Onboarding</Typography>
          <VoiceBar
            listening={listening}
            onStart={start}
            onStop={stop}
            hint="माइक दबाइए और जवाब बोलिए—'आगे', 'पीछे', 'दोहराइए', 'सबमिट' भी कह सकते हैं।"
          />

          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Stepper activeStep={active} alternativeLabel>
              {steps.map((s) => (
                <Step key={s.key}><StepLabel>{s.label}</StepLabel></Step>
              ))}
            </Stepper>

            <Grid container spacing={3} sx={{ mt: 1 }}>
              {steps.map((s, idx) => (
                <Grid key={s.key} size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label={s.label}
                    value={data[s.key] ?? ""}
                    onChange={(e) => setField(s.key, e.target.value)}
                    error={!!error && idx === active}
                    helperText={idx === active && error ? error : " "}
                  />
                </Grid>
              ))}
            </Grid>

            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button onClick={() => speak(cur.prompt)}>Repeat</Button>
              <Button disabled={active === 0} onClick={() => setActive((i) => i - 1)}>Back</Button>
              {active < steps.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={() => {
                    if (!data[cur.key]) {
                      speak("पहले इस चरण का उत्तर दीजिए।");
                      return;
                    }
                    setActive((i) => i + 1);
                  }}
                >
                  Next
                </Button>
              ) : (
                <Button variant="contained" onClick={submit}>Submit</Button>
              )}
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
