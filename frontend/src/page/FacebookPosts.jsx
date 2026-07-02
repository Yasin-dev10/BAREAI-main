import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import API from "../api";

export default function FacebookPosts() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState({
    item: null,
    summary: { totalPosts: 0, crimePosts: 0, safePosts: 0 },
    posts: [],
  });

  useEffect(() => {
    API.get(`/blacklist/facebook/${id}/posts`).then((res) => {
      setData(res.data);
    });
  }, [id]);

  return (
    <div className="p-4 sm:p-8">
      <button
          onClick={() => navigate("/blacklist")}
          className="mb-6 inline-flex items-center gap-2 bg-slate-800 text-slate-200 px-4 py-2 rounded-xl text-sm font-bold"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <h1 className="text-3xl font-bold">{data.item?.name || "Facebook Posts"}</h1>
        <p className="text-cyan-300 mt-2 break-all">{data.item?.value}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
          <Card title="Total Posts" value={data.summary.totalPosts} />
          <Card title="Crime Posts" value={data.summary.crimePosts} />
          <Card title="Not-Crime Relate" value={data.summary.safePosts} />
        </div>

        <div className="space-y-4">
          {data.posts.map((post) => (
            <div
              key={post._id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
            >
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <ShieldAlert size={17} className={post.isCrime ? "text-red-400" : "text-emerald-400"} />
                <Badge color={post.isCrime ? "red" : "green"}>
                  {post.isCrime ? "CRIME" : "NOT CRIME"}
                </Badge>
                <Badge color="cyan">{post.confidence || 0}%</Badge>
                <span className="text-xs text-slate-500">
                  {new Date(post.createdAt).toLocaleString()}
                </span>
              </div>

              <p className="text-sm text-slate-300 leading-7 whitespace-pre-wrap">
                {post.content}
              </p>

              {post.url && (
                <a
                  href={post.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-4 text-cyan-300 text-sm hover:underline"
                >
                  Open original post
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <h2 className="text-3xl font-bold mt-2">{value}</h2>
    </div>
  );
}

function Badge({ children, color }) {
  const classes = {
    red: "bg-red-500/10 text-red-300 border-red-500/30",
    green: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    cyan: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${classes[color]}`}>
      {children}
    </span>
  );
}
