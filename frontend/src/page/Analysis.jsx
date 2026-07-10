import { useState } from "react";
import {
  Link as LinkIcon,
  FileText,
  Loader2,
  Upload,
  Layers,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import API from "../api";

export default function Analysis() {
  const location = useLocation();
  const historyItem = location.state?.historyItem;
  const initialHistoryState = getHistoryInitialState(historyItem);
  const [type, setType] = useState(initialHistoryState.type);

  const [text, setText] = useState(initialHistoryState.text);
  const [url, setUrl] = useState(initialHistoryState.url);
  const [file, setFile] = useState(null);
  const [batchType, setBatchType] = useState("text");
  const [batchInput, setBatchInput] = useState(initialHistoryState.batchInput);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(initialHistoryState.result);
  const [batchResults, setBatchResults] = useState([]);
  const [error, setError] = useState("");
  const [loadedFromHistory, setLoadedFromHistory] = useState(
    initialHistoryState.loadedFromHistory
  );

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

        setResult(buildAnalysisResult(res.data, "text", text));
      }

      // BACKEND CONNECTION: URL Analysis -> POST /api/analysis/url
      if (type === "url") {
        res = await API.post("/analysis/url", { url });

        setResult(buildAnalysisResult(res.data, "url", url));
      }

      // BACKEND CONNECTION: File Analysis -> POST /api/analysis/file
      // FormData is used for file upload
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

        setResult(buildAnalysisResult(res.data, "file", file.name));
      }

      // BACKEND CONNECTION: Batch Analysis -> POST /api/analysis/batch
      // batchType = text or url, items = lines split from the textarea
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
    <div className="min-h-screen p-4 lg:p-6" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
        <div className="mb-6">
          <p className="text-sm text-slate-400">BAREAI Analysis Center</p>
          <h1 className="text-3xl font-bold text-slate-100">
            Crime Content Analysis
          </h1>
          {loadedFromHistory && (
            <div className="mt-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">
              History record opened. Previous data has been filled in; you can
              review it or analyze again.
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
                  placeholder="Enter text to analyze for crime-related content..."
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
                className="mt-5 bg-cyan-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-cyan-700 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="inline mr-2 animate-spin" size={18} />
                    Analyzing...
                  </>
                ) : (
                  <>
                    {/* <BrainCircuit className="inline mr-2" size={18} /> */}
                    {loadedFromHistory ? "Re-analyze Content" : "Analyze"}
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="bg-slate-800/60 text-white rounded-2xl p-4 border border-slate-700">
           

            {result && (
              <div className={resultCardClass(result)}>
                <h3 className="text-2xl font-black tracking-wide">
                  {formatDecision(result)}
                </h3>

                <p className="w-full whitespace-pre-wrap break-words rounded-xl bg-slate-950/30 px-3 py-3 text-left text-sm leading-6 text-white">
                  {result.postText || "No post text found"}
                </p>
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
                const isCrime = isCrimeLike(
                  item.result?.rawPrediction || item.result?.prediction,
                  item.result?.isCrime ?? item.result?.is_crime
                );

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
                        {item.success ? getDisplayText({
                          type: batchType,
                          input: item.input,
                          extractedText: item.result?.postText || item.postText,
                        }) : item.error}
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
                          ? "Crime"
                          : "Not-crime"
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
  return result?.isCrime === true || isCrimeLike(result?.rawPrediction || result?.prediction);
}

function isCrimeLike(prediction, explicitValue) {
  if (explicitValue === true) return true;
  if (explicitValue === false) return false;

  const normalized = String(prediction || "").trim().toLowerCase();
  if (!normalized || normalized.startsWith("not ")) return false;

  return [
    "crime",
    "crime-related",
    "crime related",
    "criminal",
    "1",
    "yes",
    "true",
  ].includes(normalized);
}

function resultCardClass(result) {
  const base =
    "mt-4 min-h-32 rounded-2xl border p-5 flex flex-col items-center justify-center text-center gap-3 shadow-lg";

  if (isCrimeResult(result)) {
    return `${base} bg-red-500/20 border-red-400/40 text-red-50`;
  }

  return `${base} bg-emerald-500/20 border-emerald-400/40 text-emerald-50`;
}

function buildAnalysisResult(data, type, input) {
  const result = data?.result || {};
  const isCrime = isCrimeLike(
    result.rawPrediction || result.prediction,
    result.isCrime ?? result.is_crime
  );

  return {
    prediction: isCrime ? "Crime" : "Not-crime",
    type,
    historyId: data?.historyId,
    isCrime,
    rawPrediction: result.rawPrediction || result.prediction,
    fileName: data?.file || (type === "file" ? input : null),
    postText: getDisplayText({
      type,
      input,
      extractedText: result.postText || data?.postText || data?.extractedText,
    }),
  };
}

function formatDecision(result) {
  return isCrimeResult(result) ? "Crime" : "Not-crime";
}

function getDisplayText({ type, input, extractedText }) {
  if (type === "url" || type === "file" || type === "batch") {
    return extractedText || input || "";
  }

  return input || extractedText || "";
}

function getHistoryInitialState(historyItem) {
  if (!historyItem) {
    return {
      type: "text",
      text: "",
      url: "",
      batchInput: "",
      result: null,
      loadedFromHistory: false,
    };
  }

  const historyType = historyItem.type?.toLowerCase() || "text";
  const normalizedType = ["text", "url", "file", "batch"].includes(historyType)
    ? historyType
    : "text";
  const historyIsCrime = isCrimeLike(
    historyItem.rawPrediction || historyItem.prediction,
    historyItem.isCrime
  );

  return {
    type: normalizedType,
    text: normalizedType === "text" ? historyItem.content || "" : "",
    url: normalizedType === "url" ? historyItem.content || "" : "",
    batchInput: normalizedType === "batch" ? historyItem.content || "" : "",
    result: {
      prediction: historyIsCrime ? "Crime" : "Not-crime",
      type: normalizedType,
      isCrime: historyIsCrime,
      rawPrediction: historyItem.rawPrediction || historyItem.prediction,
      fileName: normalizedType === "file" ? historyItem.content : null,
      postText: getDisplayText({
        type: normalizedType,
        input: historyItem.content,
        extractedText: historyItem.extractedText,
      }),
    },
    loadedFromHistory: true,
  };
}
