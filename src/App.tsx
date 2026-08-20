"use client";

import { useEffect, useMemo, useState } from "react";

type Result = "unknown" | "bought" | "missed";
type Item = {
  id: string;
  name: string;
  reading: string;
  quantity: string;
  note: string;
  buyBy: string;
  result: Result;
};
type Status = "draft" | "shopping" | "review" | "done";
type Memo = {
  id: string;
  title: string;
  items: Item[];
  status: Status;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  archived?: boolean;
};
type Product = {
  name: string;
  reading: string;
  count: number;
  lastBought?: string;
  quantity?: string;
  note?: string;
};
type Data = { memos: Memo[]; products: Product[] };
type Screen = "home" | "edit" | "shopping" | "review" | "history" | "products";

const baseProducts = [
  ["牛乳", "ぎゅうにゅう"],
  ["卵", "たまご"],
  ["食パン", "しょくぱん"],
  ["お米", "おこめ"],
  ["豆腐", "とうふ"],
  ["納豆", "なっとう"],
  ["玉ねぎ", "たまねぎ"],
  ["にんじん", "にんじん"],
  ["じゃがいも", "じゃがいも"],
  ["キャベツ", "きゃべつ"],
  ["しょうゆ", "しょうゆ"],
  ["みそ", "みそ"],
  ["砂糖", "さとう"],
  ["塩", "しお"],
  ["サラダ油", "さらだあぶら"],
  ["お茶", "おちゃ"],
  ["コーヒー", "こーひー"],
  ["ティッシュ", "てぃっしゅ"],
  ["トイレットペーパー", "といれっとぺーぱー"],
  ["洗剤", "せんざい"],
  ["ゴミ袋", "ごみぶくろ"],
  ["シャンプー", "しゃんぷー"],
  ["歯磨き粉", "はみがきこ"],
].map(([name, reading]) => ({ name, reading, count: 0 }));
const seed: Data = { memos: [], products: baseProducts };
const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
const now = () => new Date().toISOString();
const date = (v?: string) =>
  v
    ? new Intl.DateTimeFormat("ja-JP", {
        month: "short",
        day: "numeric",
      }).format(new Date(v))
    : "";
const norm = (v: string) =>
  v
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\sー]/g, "");
const title = (m: Memo) => m.title.trim() || `${date(m.createdAt)}のメモ`;
const summary = (m: Memo, n = 3) =>
  m.items
    .slice(0, n)
    .map((i) => i.name)
    .join("、") || "まだ商品がありません";

export default function App() {
  const [data, setData] = useState<Data>(seed),
    [ready, setReady] = useState(false),
    [screen, setScreen] = useState<Screen>("home"),
    [selectedId, setSelectedId] = useState<string>(),
    [query, setQuery] = useState(""),
    [showDone, setShowDone] = useState(false),
    [showArchived, setShowArchived] = useState(false),
    [missed, setMissed] = useState<string[]>([]),
    [toast, setToast] = useState("");
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = localStorage.getItem("kaimemo-v1");
        if (saved) setData(JSON.parse(saved));
      } catch {
        // 壊れた保存データは初期状態に戻す。
      }
      setReady(true);
    });
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem("kaimemo-v1", JSON.stringify(data));
  }, [data, ready]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  const selected = data.memos.find((m) => m.id === selectedId),
    drafts = data.memos
      .filter((m) => m.status === "draft" && !m.archived)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    active = data.memos.filter((m) => m.status === "shopping" && !m.archived),
    reviews = data.memos.filter((m) => m.status === "review" && !m.archived),
    done = data.memos
      .filter((m) => m.status === "done" && !m.archived)
      .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""));
  const archived = data.memos.filter((m) => m.archived);
  const archiveMemo = (id: string, archived: boolean) => {
    patchMemo(id, { archived });
    setToast(archived ? "メイン画面から保管しました" : "メイン画面に戻しました");
  };
  const deleteMemo = (id: string) => {
    if (!window.confirm("このメモを削除しますか？\n商品履歴は残ります。")) return;
    setData((d) => ({ ...d, memos: d.memos.filter((m) => m.id !== id) }));
    setToast("メモを削除しました");
  };
  const suggestions = useMemo(() => {
    const q = norm(query),
      score = (p: Product) => {
        const n = norm(p.name),
          r = norm(p.reading);
        return n === q || r === q
          ? 0
          : n.startsWith(q) || r.startsWith(q)
            ? 1
            : n.includes(q) || r.includes(q)
              ? 2
              : 9;
      };
    return data.products
      .filter((p) => !q || score(p) < 9)
      .sort((a, b) => (q ? score(a) - score(b) : 0) || b.count - a.count)
      .slice(0, 7);
  }, [data.products, query]);
  const patchMemo = (id: string, p: Partial<Memo>) =>
    setData((d) => ({
      ...d,
      memos: d.memos.map((m) =>
        m.id === id ? { ...m, ...p, updatedAt: now() } : m,
      ),
    }));
  const open = (m: Memo, s: Screen = "edit") => {
    setSelectedId(m.id);
    setScreen(s);
    setQuery("");
  };
  const create = () => {
    const m: Memo = {
      id: uid(),
      title: "",
      items: [],
      status: "draft",
      createdAt: now(),
      updatedAt: now(),
    };
    setData((d) => ({ ...d, memos: [m, ...d.memos] }));
    open(m);
  };
  const add = (name: string, p?: Product) => {
    if (!selected || !name.trim()) return;
    const clean = name.trim(),
      item: Item = {
        id: uid(),
        name: clean,
        reading: p?.reading || norm(clean),
        quantity: "",
        note: "",
        buyBy: "",
        result: "unknown",
      };
    setData((d) => ({
      ...d,
      memos: d.memos.map((m) =>
        m.id === selected.id
          ? { ...m, items: [...m.items, item], updatedAt: now() }
          : m,
      ),
      products: d.products.some((x) => norm(x.name) === norm(clean))
        ? d.products
        : [{ name: clean, reading: norm(clean), count: 0 }, ...d.products],
    }));
    setQuery("");
    setToast(`${clean}を追加しました`);
  };
  const itemPatch = (id: string, p: Partial<Item>) =>
    selected &&
    patchMemo(selected.id, {
      items: selected.items.map((i) => (i.id === id ? { ...i, ...p } : i)),
    });
  const start = (m: Memo) => {
    patchMemo(m.id, { status: "shopping" });
    open({ ...m, status: "shopping" }, "shopping");
  };
  const finish = (m: Memo, missedIds: string[]) => {
    const at = now(),
      items = m.items.map((i) => ({
        ...i,
        result: missedIds.includes(i.id)
          ? ("missed" as const)
          : ("bought" as const),
      })),
      carry = items
        .filter((i) => i.result === "missed")
        .map((i) => ({ ...i, id: uid(), result: "unknown" as const }));
    setData((d) => {
      const products = d.products.map((p) => {
        const b = items.find(
          (i) => i.result === "bought" && norm(i.name) === norm(p.name),
        );
        return b
          ? {
              ...p,
              count: p.count + 1,
              lastBought: at,
              quantity: b.quantity || p.quantity,
              note: b.note || p.note,
            }
          : p;
      });
      const memos = d.memos.map((x) =>
        x.id === m.id
          ? {
              ...x,
              items,
              status: "done" as const,
              completedAt: at,
              updatedAt: at,
            }
          : x,
      );
      if (carry.length)
        memos.unshift({
          id: uid(),
          title: "前回買えなかったもの",
          items: carry,
          status: "draft",
          createdAt: at,
          updatedAt: at,
        });
      return { products, memos };
    });
    setMissed([]);
    setScreen("home");
    setSelectedId(undefined);
    setToast(
      carry.length
        ? "買えなかったものを次のメモに残しました"
        : "買い物を記録しました",
    );
  };
  if (!ready)
    return <main className="app loading">買い物メモを開いています…</main>;
  return (
    <main className="app">
      <Header
        screen={screen}
        home={() => setScreen("home")}
        history={() => setScreen("history")}
      />
      {screen === "home" && (
        <section className="stack">
          {reviews.map((m) => (
            <Notice key={m.id} kind="review" memo={m}>
              <button onClick={() => open(m, "review")}>
                買い物の結果を記録する
              </button>
            </Notice>
          ))}
          {active.map((m) => (
            <Notice key={m.id} kind="active" memo={m}>
              <div className="row">
                <button onClick={() => open(m, "shopping")}>メモを見る</button>
                <button
                  className="soft"
                  onClick={() => {
                    patchMemo(m.id, { status: "review" });
                    open({ ...m, status: "review" }, "review");
                  }}
                >
                  買い物を終える
                </button>
              </div>
            </Notice>
          ))}
          <button
            className="hero green"
            onClick={() =>
              active[0] ? open(active[0], "shopping") : setScreen("shopping")
            }
          >
            <i>🛒</i>
            <span>
              <b>買い物する</b>
              <small>
                {active.length ? "買い物中のメモを開く" : "作ったメモを見る"}
              </small>
            </span>
            <em>›</em>
          </button>
          {!active.length && (
            <Picker
              memos={drafts}
              pick={start}
              empty="買い物できるメモはまだありません"
            />
          )}
          <button className="hero peach" onClick={create}>
            <i>＋</i>
            <span>
              <b>メモを作る</b>
              <small>新しい買い物をメモする</small>
            </span>
            <em>›</em>
          </button>
          {!!drafts.length && (
            <section className="block">
              <div className="heading">
                <h2>作成中のメモ</h2>
                <span>{drafts.length}件</span>
              </div>
              {drafts.slice(0, 3).map((m) => (
                <MemoCard key={m.id} memo={m} click={() => open(m)} onArchive={() => archiveMemo(m.id, true)} onDelete={() => deleteMemo(m.id)} />
              ))}
            </section>
          )}
          <section>
            <button className="fold" onClick={() => setShowDone((v) => !v)}>
              <span>{showDone ? "▲" : "▼"} 買い物が終わったメモ</span>
              <b>{done.length}件</b>
            </button>
            {showDone &&
              done
                .slice(0, 3)
                .map((m) => (
                  <MemoCard
                    compact
                    key={m.id}
                    memo={m}
                    click={() => setScreen("history")}
                    onArchive={() => archiveMemo(m.id, true)}
                    onDelete={() => deleteMemo(m.id)}
                  />
                ))}
          </section>
          {!!archived.length && (
            <section>
              <button className="fold" onClick={() => setShowArchived((v) => !v)}>
                <span>{showArchived ? "▲" : "▼"} 保管したメモ</span>
                <b>{archived.length}件</b>
              </button>
              {showArchived && archived.map((m) => (
                <MemoCard key={m.id} memo={m} click={() => open(m)} onRestore={() => archiveMemo(m.id, false)} onDelete={() => deleteMemo(m.id)} />
              ))}
            </section>
          )}
        </section>
      )}
      {screen === "shopping" && !selected && (
        <section>
          <h2 className="screenTitle">どのメモで買い物しますか？</h2>
          <Picker
            memos={drafts}
            pick={start}
            empty="先に買い物メモを作ってください"
          />
          <button className="wide secondary" onClick={create}>
            ＋ 新しくメモを作る
          </button>
        </section>
      )}
      {screen === "edit" && selected && (
        <Editor
          memo={selected}
          query={query}
          setQuery={setQuery}
          suggestions={suggestions}
          add={add}
          patchMemo={patchMemo}
          itemPatch={itemPatch}
          remove={(id) =>
            patchMemo(selected.id, {
              items: selected.items.filter((i) => i.id !== id),
            })
          }
          start={start}
        />
      )}
      {screen === "shopping" && selected && (
        <section>
          <div className="screenHead">
            <div>
              <p className="eyebrow">買い物中</p>
              <h2 className="screenTitle">{title(selected)}</h2>
            </div>
            <span className="pill">
              {selected.items.filter((i) => i.result === "bought").length}/
              {selected.items.length}
            </span>
          </div>
          <p className="hint">
            買えたものは、あとからまとめて記録しても大丈夫です。
          </p>
          <div className="shoppingList">
            {selected.items.map((i) => (
              <button
                key={i.id}
                className={`shoppingItem ${i.result === "bought" ? "checked" : ""}`}
                onClick={() =>
                  itemPatch(i.id, {
                    result: i.result === "bought" ? "unknown" : "bought",
                  })
                }
              >
                <i>{i.result === "bought" ? "✓" : ""}</i>
                <span>
                  <b>
                    {i.name}
                    {i.quantity && `・${i.quantity}`}
                  </b>
                  {i.note && <small>{i.note}</small>}
                  {i.buyBy && <small>{date(i.buyBy)}まで</small>}
                </span>
              </button>
            ))}
          </div>
          <button
            className="wide primary"
            onClick={() => {
              patchMemo(selected.id, { status: "review" });
              setScreen("review");
            }}
          >
            買い物を終える
          </button>
          <button className="wide ghost" onClick={() => setScreen("home")}>
            ホームに戻る
          </button>
        </section>
      )}
      {screen === "review" && selected && (
        <section>
          <p className="eyebrow">買い物の結果</p>
          <h2 className="screenTitle">買えたものを記録しましょう</h2>
          <p className="hint">
            チェックしていなくても大丈夫です。全部買えたなら、そのまま下のボタンを押してください。
          </p>
          <button
            className="wide primary big"
            onClick={() => finish(selected, [])}
          >
            全部買えた
          </button>
          <details className="missed" open={missed.length > 0}>
            <summary>買えなかった物がある</summary>
            <p>買えなかった物だけを選んでください。</p>
            {selected.items.map((i) => (
              <label key={i.id}>
                <input
                  type="checkbox"
                  checked={missed.includes(i.id)}
                  onChange={() =>
                    setMissed((x) =>
                      x.includes(i.id)
                        ? x.filter((y) => y !== i.id)
                        : [...x, i.id],
                    )
                  }
                />
                {i.name}
              </label>
            ))}
            <button
              className="wide secondary"
              disabled={!missed.length}
              onClick={() => finish(selected, missed)}
            >
              選んだ物を次回に残して終わる
            </button>
          </details>
          <button
            className="wide ghost"
            onClick={() => {
              patchMemo(selected.id, { status: "review" });
              setScreen("home");
              setToast("あとでホームから確認できます");
            }}
          >
            あとで確認する
          </button>
        </section>
      )}
      {screen === "history" && (
        <History memos={done} archived={archived} products={() => setScreen("products")} onRestore={(id) => archiveMemo(id, false)} onDelete={deleteMemo} />
      )}{" "}
      {screen === "products" && <Products products={data.products} />}{" "}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function Header({
  screen,
  home,
  history,
}: {
  screen: Screen;
  home: () => void;
  history: () => void;
}) {
  return (
    <header>
      <button className="back" onClick={home}>
        {screen !== "home" ? "←" : ""}
      </button>
      <div>
        <p>わたしの</p>
        <h1>買い物メモ</h1>
      </div>
      <button className="history" onClick={history}>
        履歴
      </button>
    </header>
  );
}
function Notice({
  kind,
  memo,
  children,
}: {
  kind: string;
  memo: Memo;
  children: React.ReactNode;
}) {
  return (
    <article className={`notice ${kind}`}>
      <small>{kind === "review" ? "あとで確認" : "買い物中"}</small>
      <strong>{title(memo)}</strong>
      <p>{summary(memo)}</p>
      {children}
    </article>
  );
}
function MemoCard({
  memo,
  click,
  compact = false,
  onArchive,
  onRestore,
  onDelete,
}: {
  memo: Memo;
  click: () => void;
  compact?: boolean;
  onArchive?: () => void;
  onRestore?: () => void;
  onDelete?: () => void;
}) {
  const [menu, setMenu] = useState(false);
  return (
    <div className={`memoCard ${compact ? "compact" : ""}`}>
      <button className="memoCard-main" onClick={click}>
      <span>
        <b>{title(memo)}</b>
        <small>{summary(memo, compact ? 3 : 4)}</small>
      </span>
      <em>
        {memo.status === "done"
          ? date(memo.completedAt)
          : `${memo.items.length}品`}{" "}
        ›
      </em>
      </button>
      {(onArchive || onRestore || onDelete) && <button className="memo-menu-button" aria-label="メモの操作" onClick={() => setMenu((v) => !v)}>•••</button>}
      {menu && <div className="memo-menu">
        {onArchive && <button onClick={() => { onArchive(); setMenu(false); }}>メイン画面から隠す</button>}
        {onRestore && <button onClick={() => { onRestore(); setMenu(false); }}>メイン画面に戻す</button>}
        {onDelete && <button className="danger" onClick={() => { onDelete(); setMenu(false); }}>削除</button>}
      </div>}
    </div>
  );
}
function Picker({
  memos,
  pick,
  empty,
}: {
  memos: Memo[];
  pick: (m: Memo) => void;
  empty: string;
}) {
  return (
    <div className="picker">
      {memos.length ? (
        memos.map((m) => <MemoCard key={m.id} memo={m} click={() => pick(m)} />)
      ) : (
        <p className="empty">{empty}</p>
      )}
    </div>
  );
}
function Editor({
  memo,
  query,
  setQuery,
  suggestions,
  add,
  patchMemo,
  itemPatch,
  remove,
  start,
}: {
  memo: Memo;
  query: string;
  setQuery: (s: string) => void;
  suggestions: Product[];
  add: (s: string, p?: Product) => void;
  patchMemo: (id: string, p: Partial<Memo>) => void;
  itemPatch: (id: string, p: Partial<Item>) => void;
  remove: (id: string) => void;
  start: (m: Memo) => void;
}) {
  return (
    <section>
      <label className="field">
        メモの名前 <span>なくてもOK</span>
        <input
          value={memo.title}
          onChange={(e) => patchMemo(memo.id, { title: e.target.value })}
          placeholder="例：スーパー、日用品"
        />
      </label>
      <div className="addBox">
        <div className="fieldName">買うもの</div>
        <div className="inputRow">
          <input
            aria-label="買うもの"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add(query);
            }}
            placeholder="ひらがな・商品名で入力"
          />
          <button disabled={!query.trim()} onClick={() => add(query)}>
            追加
          </button>
        </div>
        {(query || suggestions.some((x) => x.count > 0)) && (
          <div className="suggestions">
            {suggestions.map((p) => (
              <button key={p.name} onClick={() => add(p.name, p)}>
                <span>
                  <b>{p.name}</b>
                  {p.count > 0 && (
                    <small>
                      前回：
                      {[p.quantity, p.note].filter(Boolean).join("・") ||
                        "購入済み"}
                    </small>
                  )}
                </span>
                <em>＋</em>
              </button>
            ))}
            {query &&
              !suggestions.some((p) => norm(p.name) === norm(query)) && (
                <button onClick={() => add(query)}>
                  <span>
                    <b>「{query}」をそのまま追加</b>
                    <small>次回から候補に表示します</small>
                  </span>
                  <em>＋</em>
                </button>
              )}
          </div>
        )}
      </div>
      <div>
        {memo.items.map((i) => (
          <details className="editItem" key={i.id}>
            <summary>
              <b>{i.name}</b>
              <small>
                {[i.quantity, i.note, i.buyBy && `${date(i.buyBy)}まで`]
                  .filter(Boolean)
                  .join("・") || "数量や補足を追加"}
              </small>
            </summary>
            <div>
              <label>
                数量
                <input
                  value={i.quantity}
                  onChange={(e) =>
                    itemPatch(i.id, { quantity: e.target.value })
                  }
                  placeholder="例：2本"
                />
              </label>
              <label>
                補足
                <input
                  value={i.note}
                  onChange={(e) => itemPatch(i.id, { note: e.target.value })}
                  placeholder="例：いつもの低脂肪"
                />
              </label>
              <label>
                いつまでに買う
                <input
                  type="date"
                  value={i.buyBy}
                  onChange={(e) => itemPatch(i.id, { buyBy: e.target.value })}
                />
              </label>
              <button className="danger" onClick={() => remove(i.id)}>
                この商品を削除
              </button>
            </div>
          </details>
        ))}
      </div>
      {memo.items.length > 0 && (
        <button className="wide primary sticky" onClick={() => start(memo)}>
          このメモで買い物する
        </button>
      )}
      <p className="autosave">入力内容は、この端末に自動保存されます</p>
    </section>
  );
}
function History({ memos, archived, products, onRestore, onDelete }: { memos: Memo[]; archived: Memo[]; products: () => void; onRestore: (id: string) => void; onDelete: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"done" | "archived">("done");
  const source = tab === "done" ? memos : archived;
  const filtered = source.filter(
    (m) =>
      !q ||
      norm(`${m.title}${m.items.map((i) => i.name + i.note)}`).includes(
        norm(q),
      ),
  );
  return (
    <section>
      <h2 className="screenTitle">買い物の履歴</h2>
      <div className="tabs">
        <button className={tab === "done" ? "on" : ""} onClick={() => setTab("done")}>買い物メモ</button>
        <button className={tab === "archived" ? "on" : ""} onClick={() => setTab("archived")}>保管したメモ</button>
        <button onClick={products}>商品ごと</button>
      </div>
      <input
        className="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="商品名やメモ名で検索"
      />
      {filtered.map((m) => (
        <details className="historyCard" key={m.id}>
          <summary>
            <span>
              <b>{title(m)}</b>
              <small>
                {date(m.completedAt)}・{m.items.length}品
              </small>
            </span>
            ⌄
          </summary>
          <ul>
            {m.items.map((i) => (
              <li key={i.id}>
                <span>
                  {i.name}
                  {i.quantity && `・${i.quantity}`}
                  <small>{i.note}</small>
                </span>
                <em>{i.result === "missed" ? "買えず" : "購入"}</em>
              </li>
            ))}
          </ul>
          {tab === "archived" && <div className="history-actions"><button onClick={() => onRestore(m.id)}>メイン画面に戻す</button><button className="danger" onClick={() => onDelete(m.id)}>削除</button></div>}
        </details>
      ))}
      {!filtered.length && <p className="empty">履歴はまだありません</p>}
    </section>
  );
}
function Products({ products }: { products: Product[] }) {
  const [q, setQ] = useState("");
  const list = products
    .filter(
      (p) => p.count > 0 && (!q || norm(p.name + p.reading).includes(norm(q))),
    )
    .sort((a, b) => b.count - a.count);
  return (
    <section>
      <h2 className="screenTitle">商品の履歴</h2>
      <p className="hint">以前の数量や補足は、次のメモ作りで候補になります。</p>
      <input
        className="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="商品名で検索"
      />
      <div className="products">
        {list.map((p) => (
          <article key={p.name}>
            <span>
              <b>{p.name}</b>
              <small>
                {[p.quantity, p.note].filter(Boolean).join("・") || "補足なし"}
              </small>
            </span>
            <span>
              <b>{p.count}回</b>
              <small>前回 {date(p.lastBought)}</small>
            </span>
          </article>
        ))}
        {!list.length && (
          <p className="empty">買った商品は、ここに記録されます</p>
        )}
      </div>
    </section>
  );
}
