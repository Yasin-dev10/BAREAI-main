import { useEffect, useState } from "react";
import {
  BrainCircuit,
  Link as LinkIcon,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Upload,
  Layers,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import API from "../api";

export default function Analysis() {
  const location = useLocation();
  const historyItem = location.state?.historyItem;
  const [type, setType] = useState("text");

  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [batchType, setBatchType] = useState("text");
  const [batchInput, setBatchInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [batchResults, setBatchResults] = useState([]);
  const [error, setError] = useState("");
  const [loadedFromHistory, setLoadedFromHistory] = useState(false);

  useEffect(() => {
    if (!historyItem) return;

    const historyType = historyItem.type?.toLowerCase() || "text";
    const normalizedType = ["text", "url", "file", "batch"].includes(historyType)
      ? historyType
      : "text";

    setType(normalizedType);
    setText(normalizedType === "text" ? historyItem.content || "" : "");
    setUrl(normalizedType === "url" ? historyItem.content || "" : "");
    setBatchInput(normalizedType === "batch" ? historyItem.content || "" : "");
    const historyIsCrime = isCrimeLike(
      historyItem.rawPrediction || historyItem.prediction,
      historyItem.isCrime
    );
    setResult({
      prediction: historyIsCrime ? "CRIME DETECTED" : "SAFE CONTENT",
      confidence: historyItem.confidence,
      type: normalizedType,
      isCrime: historyIsCrime,
      rawPrediction: historyItem.rawPrediction || historyItem.prediction,
      matchedKeyword: historyItem.matchedKeyword,
      location: historyItem.location || [],
      blacklistMatches: historyItem.blacklistMatches || [],
      fileName: normalizedType === "file" ? historyItem.content : null,
    });
    setBatchResults([]);
    setError("");
    setLoadedFromHistory(true);
  }, [historyItem]);

  const resetResults = () => {
    setResult(null);
    setBatchResults([]);
    setError("");
    setLoadedFromHistory(false);
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setLoading(true);
    resetResults();

    try {
      let res;

      // BACKEND CONNECTION: Text Analysis -> POST /api/analysis/text
      if (type === "text") {
        res = await API.post("/analysis/text", { text });

        setResult({
          prediction: res.data.result.isCrime ? "CRIME DETECTED" : "SAFE CONTENT",
          confidence: res.data.result.confidence,
          type: "text",
          historyId: res.data.historyId,
          isCrime: res.data.result.isCrime,
          rawPrediction: res.data.result.prediction,
          matchedKeyword: res.data.result.matchedKeyword,
          location: res.data.result.location || [],
          blacklistMatches: res.data.result.blacklistMatches || [],
        });
      }

      // BACKEND CONNECTION: URL Analysis -> POST /api/analysis/url
      if (type === "url") {
        res = await API.post("/analysis/url", { url });

        setResult({
          prediction: res.data.result.isCrime ? "CRIME DETECTED" : "SAFE CONTENT",
          confidence: res.data.result.confidence,
          type: "url",
          historyId: res.data.historyId,
          isCrime: res.data.result.isCrime,
          rawPrediction: res.data.result.prediction,
          matchedKeyword: res.data.result.matchedKeyword,
          location: res.data.result.location || [],
          blacklistMatches: res.data.result.blacklistMatches || [],
        });
      }

      // BACKEND CONNECTION: File Analysis -> POST /api/analysis/file
      // FormData ayaa loo isticmaalayaa file upload
      if (type === "file") {
        if (!file) {
          setError("Please select a file first");
          setLoading(false);
          return;
        }

        const formData = new FormData();
        formData.append("file", file);

        res = await API.post("/analysis/file", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        setResult({
          prediction: res.data.result.isCrime ? "CRIME DETECTED" : "SAFE CONTENT",
          confidence: res.data.result.confidence,
          type: "file",
          historyId: res.data.historyId,
          isCrime: res.data.result.isCrime,
          rawPrediction: res.data.result.prediction,
          matchedKeyword: res.data.result.matchedKeyword,
          location: res.data.result.location || [],
          blacklistMatches: res.data.result.blacklistMatches || [],
          fileName: res.data.file,
        });
      }

      // BACKEND CONNECTION: Batch Analysis -> POST /api/analysis/batch
      // batchType = text ama url, items = lines-ka textarea laga jaray
      if (type === "batch") {
        const items = batchInput
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean);

        if (items.length === 0) {
          setError("Please enter at least one item");
          setLoading(false);
          return;
        }

        res = await API.post("/analysis/batch", {
          type: batchType,
          items,
        });

        setBatchResults(res.data.results || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: "text", label: "Text", icon: FileText },
    { key: "url", label: "URL", icon: LinkIcon },
    { key: "file", label: "File", icon: Upload },
    { key: "batch", label: "Batch", icon: Layers },
  ];

  return (
    <div className="min-h-screen bg-slate-900 p-4 lg:p-6">
        <div className="mb-6">
          <p className="text-sm text-slate-400">BAREAI Analysis Center</p>
          <h1 className="text-3xl font-bold text-slate-100">
            Crime Content Analysis
          </h1>
          {loadedFromHistory && (
            <div className="mt-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">
              History record ayaa la furay. Xogtii hore waa la buuxiyay, waadna
              hubin kartaa ama dib ayaad u analyze-gareyn kartaa.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-slate-800/40 rounded-2xl p-4 shadow-sm border border-slate-700">
            <div className="flex flex-wrap gap-2 mb-4">
              {tabs.map((tab) => {
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setType(tab.key);
                      resetResults();
                    }}
                    className={`px-4 py-2.5 rounded-xl font-semibold ${
                      type === tab.key
                        ? "bg-cyan-500 text-slate-950"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    <Icon className="inline mr-2" size={18} />
                    {tab.label} 
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleAnalyze}>
              {type === "text" && (
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  required
                  rows="8"
                  placeholder="Enter Somali text to analyze crime or not crime..."
                  className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              )}

              {type === "url" && (
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  placeholder="Paste article / website URL..."
                  className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              )}

              {type === "file" && (
                <div className="border-2 border-dashed border-slate-700 rounded-2xl p-4 bg-slate-900">
                  <Upload className="text-cyan-400 mb-3" size={34} />
                  <h3 className="font-bold text-slate-100">Upload File</h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Supported files: PDF, DOCX, TXT
                  </p>

                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="block w-full text-sm text-slate-300"
                  />

                  {file && (
                    <p className="mt-3 text-sm text-cyan-400 font-medium">
                      Selected: {file.name}
                    </p>
                  )}
                </div>
              )}

              {type === "batch" && (
                <div>
                  <div className="flex gap-3 mb-4">
                    <button
                      type="button"
                      onClick={() => setBatchType("text")}
                      className={`px-4 py-2 rounded-xl font-semibold ${
                        batchType === "text"
                          ? "bg-cyan-500 text-slate-950"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      Batch Text
                    </button>

                    <button
                      type="button"
                      onClick={() => setBatchType("url")}
                      className={`px-4 py-2 rounded-xl font-semibold ${
                        batchType === "url"
                          ? "bg-cyan-500 text-slate-950"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      Batch URL
                    </button>
                  </div>

                  <textarea
                    value={batchInput}
                    onChange={(e) => setBatchInput(e.target.value)}
                    required
                  rows="8"
                    placeholder={
                      batchType === "text"
                        ? "Enter multiple texts, one per line..."
                        : "Enter multiple URLs, one per line..."
                    }
                    className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 rounded-xl bg-red-500/10 text-red-300 border border-red-500/30">
                  {error}
                </div>
              )}

              <button
                disabled={loading}
                className="mt-5 bg-[#061b35] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#08294f] disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="inline mr-2 animate-spin" size={18} />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <BrainCircuit className="inline mr-2" size={18} />
                    {loadedFromHistory ? "Re-analyze Content" : "Analyze Content"}
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="bg-slate-800/60 text-white rounded-2xl p-4 border border-slate-700">
            <BrainCircuit className="text-cyan-300 mb-4" size={38} />
            <h2 className="text-xl font-bold">AI Detection Engine</h2>
            <p className="text-slate-300 text-sm mt-2">
              Analyze text, URLs, files and batch inputs using your trained AI model.
            </p>

            {result && (
              <div className={resultCardClass(result)}>
                {isCrimeResult(result) ? (
                  <AlertTriangle className="text-red-200" size={34} />
                ) : (
                  <ShieldCheck className="text-emerald-200" size={34} />
                )}

                <h3 className="text-2xl font-black tracking-wide">
                  {isCrimeResult(result) ? "CRIME DETECTED" : "NOT CRIME"}
                </h3>

                {/* MODEL OUTPUT: confidence, keyword, location iyo blacklist matches ayaa halkan investigator/admin uga muuqda. */}
                <div className="w-full text-left text-sm space-y-2">
                  <InfoLine label="Confidence" value={`${result.confidence || 0}%`} />
                  <InfoLine label="Matched Keyword" value={result.matchedKeyword || "Not found"} />
                  <InfoLine
                    label="Location"
                    value={
                      result.location?.length
                        ? result.location
                            .map((item) => item.district_or_city || item.city)
                            .join(", ")
                        : "Not found"
                    }
                  />
                  <InfoLine
                    label="Blacklist Matches"
                    value={result.blacklistMatches?.length || 0}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {batchResults.length > 0 && (
          <div className="mt-4 bg-slate-800/40 rounded-2xl p-4 border border-slate-700 shadow-sm">
            <h2 className="text-lg font-bold text-slate-100 mb-4">
              Batch Results
            </h2>

            <div className="space-y-3">
              {batchResults.map((item, index) => {
                const isCrime = item.result?.isCrime;

                return (
                  <div
                    key={index}
                    className="flex flex-col items-start justify-between gap-3 p-3 rounded-xl bg-slate-900 border border-slate-700 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="font-medium text-slate-200 break-all">
                        {item.input}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.success
                          ? `Confidence: ${item.result?.confidence}%`
                          : item.error}
                      </p>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        item.success
                          ? isCrime
                            ? "bg-red-500/10 text-red-300 border border-red-500/30"
                            : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {item.success
                        ? isCrime
                          ? "CRIME"
                          : "SAFE"
                        : "FAILED"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
    </div>
  );
}

function isCrimeResult(result) {
  return result?.prediction === "CRIME DETECTED" || result?.isCrime === true;
}

function isCrimeLike(prediction, explicitValue) {
  if (explicitValue === true) return true;
  if (explicitValue === false) return false;

  const normalized = String(prediction || "").trim().toLowerCase();
  if (!normalized || normalized.startsWith("not ")) return false;

  return ["crime", "crime-related", "criminal", "1", "yes"].includes(normalized);
}

function resultCardClass(result) {
  const base =
    "mt-4 min-h-32 rounded-2xl border p-5 flex flex-col items-center justify-center text-center gap-3 shadow-lg";

  if (isCrimeResult(result)) {
    return `${base} bg-red-500/20 border-red-400/40 text-red-50`;
  }

  return `${base} bg-emerald-500/20 border-emerald-400/40 text-emerald-50`;
}

function InfoLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-950/30 px-3 py-2">
      <span className="text-slate-200/80">{label}</span>
      <span className="font-bold text-white text-right">{value}</span>
    </div>
  );
}
