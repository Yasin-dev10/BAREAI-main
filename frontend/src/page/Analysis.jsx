import { useState } from "react";
import {
  Link as LinkIcon,
  FileText,
  Loader2,
  Upload,
  Layers,
  History,
  Send,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../api";
import { getStoredUser } from "../theme";
export default function Analysis() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getStoredUser();
  const canSendToCase =
    user?.role === "admin" || user?.role === "investigator";
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
  const [sendingCase, setSendingCase] = useState(false);
  const [loadedFromHistory, setLoadedFromHistory] = useState(
    initialHistoryState.loadedFromHistory
  );

  const resetResults = () => {
    setResult(null);
    setBatchResults([]);
    setError("");
    setLoadedFromHistory(false);
  };

  const sendResultToCase = async () => {
    if (!result?.historyId || sendingCase) return;

    try {
      setSendingCase(true);
      setError("");
      const res = await API.post("/investigation/cases", {
        historyId: result.historyId,
      });
      const caseId = res.data?.case?._id;
      navigate(caseId ? `/cases?case=${caseId}` : "/cases");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to send to Case Management. Open History to retry."
      );
    } finally {
      setSendingCase(false);
    }
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

  const fieldStyle = {
    backgroundColor: "var(--bg-elevated)",
    borderColor: "var(--border-base)",
    color: "var(--text-primary)",
  };

  const tabStyle = (active) => ({
    backgroundColor: active ? "var(--brand)" : "var(--bg-elevated)",
    color: active ? "#ffffff" : "var(--text-secondary)",
    borderColor: active ? "var(--brand)" : "var(--border-base)",
  });

  return (
    <div
      className="min-h-screen p-4 lg:p-6 font-sans transition-colors duration-300"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <div className="page-header">
        <div>
          <h1 className="page-title">Crime Content Analysis</h1>
          <p className="page-subtitle">
            Analyze text, URLs, files, or batch inputs for crime-related content.
          </p>
        </div>
      </div>

      {loadedFromHistory && (
        <div
          className="mb-4 rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--brand-ring)",
            backgroundColor: "var(--brand-soft)",
            color: "var(--text-secondary)",
          }}
        >
          History record opened. Previous data has been filled in; you can
          review it or analyze again.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card p-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = type === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setType(tab.key);
                    resetResults();
                  }}
                  className="px-4 py-2.5 rounded-xl font-semibold border transition-colors"
                  style={tabStyle(active)}
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
                className="w-full p-4 rounded-2xl border placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand-ring)]"
                style={fieldStyle}
              />
            )}

            {type === "url" && (
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                placeholder="Paste article / website URL..."
                className="w-full p-4 rounded-2xl border placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand-ring)]"
                style={fieldStyle}
              />
            )}

            {type === "file" && (
              <div
                className="border-2 border-dashed rounded-2xl p-4"
                style={{
                  borderColor: "var(--border-base)",
                  backgroundColor: "var(--bg-elevated)",
                }}
              >
                <Upload className="mb-3 brand-text" size={34} />
                <h3 className="font-bold" style={{ color: "var(--text-primary)" }}>
                  Upload File
                </h3>
                <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                  Supported files: PDF, DOCX, TXT
                </p>

                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="block w-full text-sm"
                  style={{ color: "var(--text-secondary)" }}
                />

                {file && (
                  <p className="mt-3 text-sm font-medium brand-text">
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
                    className="px-4 py-2 rounded-xl font-semibold border transition-colors"
                    style={tabStyle(batchType === "text")}
                  >
                    Batch Text
                  </button>

                  <button
                    type="button"
                    onClick={() => setBatchType("url")}
                    className="px-4 py-2 rounded-xl font-semibold border transition-colors"
                    style={tabStyle(batchType === "url")}
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
                  className="w-full p-4 rounded-2xl border placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand-ring)]"
                  style={fieldStyle}
                />
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-5 btn-primary px-6 py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Analyzing...
                </>
              ) : (
                loadedFromHistory ? "Re-analyze Content" : "Analyze"
              )}
            </button>
          </form>
        </div>

        <div className="card p-4">
          {result && (
            <div className={resultCardClass(result)}>
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                Decision
              </p>
              <span className={decisionBadgeClass(result)}>
                {formatDecision(result)}
              </span>

              <p
                className="w-full whitespace-pre-wrap break-words rounded-xl px-3 py-3 text-left text-sm leading-6 border"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-base)",
                  color: "var(--text-primary)",
                }}
              >
                {result.postText || "No post text found"}
              </p>

              <div className="mt-2 flex w-full flex-col gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/history")}
                  className="btn-secondary justify-center"
                >
                  <History size={16} />
                  Continue in History
                </button>
                {canSendToCase && result.historyId && (
                  <button
                    type="button"
                    disabled={sendingCase}
                    onClick={sendResultToCase}
                    className="btn-primary justify-center"
                  >
                    <Send size={16} />
                    {sendingCase ? "Sending..." : "Send to Case Management"}
                  </button>
                )}
              </div>
            </div>
          )}

          {!result && batchResults.length === 0 && (
            <div
              className="mt-1 min-h-32 rounded-2xl border p-5 flex flex-col items-center justify-center text-center gap-3"
              style={{ borderColor: "var(--border-base)" }}
            >
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No analysis results found
              </p>
            </div>
          )}
        </div>
      </div>

      {batchResults.length > 0 && (
        <div className="mt-4 card p-4">
          <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)" }}>
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
                  className="flex flex-col items-start justify-between gap-3 p-3 rounded-xl border sm:flex-row sm:items-center"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    borderColor: "var(--border-base)",
                  }}
                >
                  <div>
                    <p className="font-medium break-all" style={{ color: "var(--text-primary)" }}>
                      {item.input}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {item.success
                        ? getDisplayText({
                            type: batchType,
                            input: item.input,
                            extractedText: item.result?.postText || item.postText,
                          })
                        : item.error}
                    </p>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      item.success
                        ? isCrime
                          ? "bg-red-500/10 text-red-400 border-red-500/30"
                          : "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                    }`}
                  >
                    {item.success ? (isCrime ? "Crime" : "Not-crime") : "FAILED"}
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
    "min-h-32 rounded-2xl border p-5 flex flex-col items-center justify-center text-center gap-3";

  if (isCrimeResult(result)) {
    return `${base} bg-red-500/10 border-red-500/40`;
  }

  return `${base} bg-emerald-500/10 border-emerald-500/40`;
}

function decisionBadgeClass(result) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-lg font-black tracking-wide";

  if (isCrimeResult(result)) {
    return `${base} bg-red-600 text-white`;
  }

  return `${base} bg-emerald-600 text-white`;
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
      historyId: historyItem._id || historyItem.id || null,
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
