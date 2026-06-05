'use client'

import { useEffect, useState } from 'react'
import type { XPostResult, XReplyResult } from '@/types'

type Mode = 'news' | 'reply'

const STYLE_STORAGE_KEY = 'x-posts-style-samples'

// 本人の実投稿（@kngkwuc）。文体と視点の癖の見本として既定で使う。
// 特徴: 断定を「〜かなと。」「〜と思う。」で和らげる／短文で句点多め／
// 表面の指標より本質変数を一突き／Why-What-Howで浅さを突く。
const DEFAULT_STYLE_SAMPLES = `できるビジネスパーソンは、適切なタイミングでの報告や時間を設定したネクストアクションを共有してくれる。だから、こっちは頭のタブを開きっぱなしにしなくていいから、余計なメモリを使わなくて済むんですよね。
資料作成とかも一緒。それっぽい資料をAIで作ってくる。使いかたを考えないから、Howの話からスタートしてて、WhyとWhatを聞くと答えられないパターン多いなと。
何人辞めるかより誰が辞めるかの方が大事。これを理解してない人事が多すぎる。かなと。
心理的安全性は健全な研鑽を継続する集団にこそ存在すべきだと思っている。勉強しない人に対する受容を大事だと考えることは組織を強くしない。と思います。
人事というのは企業において根幹をなす本当に重要な役割。その本質を理解できていない人事、特に採用担当が多すぎると感じる。経営者はそこにもっとアンテナを高くしないといけない。経営がビジネスで信頼を獲得しても人事から信頼がこぼれ落ちていることが往々にある。と思います。
こういう面接は改めないとと思う。・応募者と面接者の役職が合ってない・面接の内容が不明確（目的、手段、期待行動が落とし込み切れてない）・いきなり会社説明。結果的に応募者は会社に対するネガティブな印象とともに去ってしまう。特にハイレイヤーは。経営はちゃんと認識しないといけないと思う。
正社員だから、バイトだけど、みたいな話ではなく、働くからには責任感は持つべきだし、求められるべきだと思う。そもそも責任を取れなんて思ってないし、責任を取れるのは経営者くらいな訳で。
ちなみに低反発バットになって高校野球の戦術も大きく変わってきましたね。高知高校の戦術なんかは軟式野球の戦い方を熟知している監督さんが選択しそうだなと思ったら浜口監督は高知中の軟式野球部の監督として全国制覇をされてるんですね。
井端さんが日本代表の監督になるのであれば高校日本代表においても選出される選手は井端さんが目指す野球に沿った選出になるべきだなと思うけど、プロアマの壁が厚く存在する日本野球会では難しい話だなとも思う。プロアマの壁はいろんな歴史や出来事があってのことなんで一概に全否定はできないけど。
今年も山村学園は普通に強い！そして昔から聖望のプレースタイルは大学野球のようで好き。テンションのメリハリをちゃんとわかってるのはすごいよね。
投手もやってフルシーズン出場しないでホームラン王とかおそろしいよ…しかもメジャーで。スゴイぜ、オオタニサン
宅配業者の皆さんがお忙しいのは理解した上でなんだけど、ピンポン鳴らしてから不在判断までが早すぎるのでトイレや2階にいたら間に合わないレベル。
スタバで作業しようと思って入った瞬間に「Uberの方ですね？」って店員さんに言われた…スタバなうorz
ポテトサラダはサラダだと信じたい。
しんどい時にコールドプレイがかかってきて泣きそうになった。`

const PROFILE_STORAGE_KEY = 'x-posts-author-profile'

// 本人のプロフィール（@kngkwuc）。蝶番選びの視座の源泉として使う。
const DEFAULT_AUTHOR_PROFILE = `元証券マン、元高校野球監督、元エチオピア住民。小さな会社（tenaadam.co.jp）を経営。大学院の博士課程後期に在籍。横浜在住。趣味は釣りとボート。1982年生まれ。`

export default function XPostsPage() {
  const [mode, setMode] = useState<Mode>('news')
  const [news, setNews] = useState('')
  const [replyTarget, setReplyTarget] = useState('')
  const [styleSamples, setStyleSamples] = useState('')
  const [authorProfile, setAuthorProfile] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<XPostResult | null>(null)
  const [replyResult, setReplyResult] = useState<XReplyResult | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // 過去投稿の見本はブラウザに保存し、毎回貼り直さずに済むようにする。
  // localStorageはSSR時に無いためmount後に読み込む（定石パターン）。
  useEffect(() => {
    // 保存済みがあれば優先、無ければ本人の実データを既定にする
    const storedSamples = localStorage.getItem(STYLE_STORAGE_KEY)
    const storedProfile = localStorage.getItem(PROFILE_STORAGE_KEY)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStyleSamples(storedSamples ?? DEFAULT_STYLE_SAMPLES)
    setAuthorProfile(storedProfile ?? DEFAULT_AUTHOR_PROFILE)
  }, [])

  const updateStyleSamples = (value: string) => {
    setStyleSamples(value)
    localStorage.setItem(STYLE_STORAGE_KEY, value)
  }

  const updateAuthorProfile = (value: string) => {
    setAuthorProfile(value)
    localStorage.setItem(PROFILE_STORAGE_KEY, value)
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setError('')
    setResult(null)
    setReplyResult(null)
  }

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    setReplyResult(null)

    const endpoint = mode === 'news' ? '/api/x-posts' : '/api/x-posts/reply'
    const body = mode === 'news'
      ? { news, style_samples: styleSamples, author_profile: authorProfile }
      : { target_post: replyTarget, style_samples: styleSamples, author_profile: authorProfile }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? '生成に失敗しました')
      setLoading(false)
      return
    }

    const data = await res.json()
    if (mode === 'news') setResult(data)
    else setReplyResult(data)
    setLoading(false)
  }

  const inputEmpty = mode === 'news' ? news.trim().length === 0 : replyTarget.trim().length === 0

  const copyPost = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1500)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">X投稿候補を生成</h1>
        <p className="text-sm text-gray-500 mt-1">
          {mode === 'news'
            ? 'ニュースの「肝（蝶番）」を特定し、読者の予想を変える深い投稿候補を提案します'
            : '相手の投稿に、あなたの横断視点で新しい角度を足す返信候補を提案します'}
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => switchMode('news')}
          className={`flex-1 text-sm py-2 rounded-lg border transition-colors ${mode === 'news' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
        >
          ニュースから投稿
        </button>
        <button
          type="button"
          onClick={() => switchMode('reply')}
          className={`flex-1 text-sm py-2 rounded-lg border transition-colors ${mode === 'reply' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
        >
          リプライを作る
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        {mode === 'news' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              ニュース本文 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={news}
              onChange={e => setNews(e.target.value)}
              rows={8}
              placeholder="深掘りしたいニュースの本文や要点を貼り付けてください"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              返信先の投稿 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={replyTarget}
              onChange={e => setReplyTarget(e.target.value)}
              rows={6}
              placeholder="リプライしたい相手の投稿を貼り付けてください（格上アカウントへの的確な返信が新規フォロー流入の主経路になります）"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            あなたの経歴・立場（切り口の視座）
          </label>
          <textarea
            value={authorProfile}
            onChange={e => updateAuthorProfile(e.target.value)}
            rows={3}
            placeholder="職歴・専門・経験など。他の人が持てない視座ほど、ニュースを斬る角度が深くなります（ブラウザに保存され、次回も使えます）"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            あなたの過去のX投稿（文体の見本）
          </label>
          <textarea
            value={styleSamples}
            onChange={e => updateStyleSamples(e.target.value)}
            rows={6}
            placeholder="あなたらしい投稿を5〜10本、改行で区切って貼り付けてください。文体と視点の癖を学習し、あなたに近い文章で候補を生成します（ブラウザに保存され、次回も使えます）"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            未入力でも生成できますが、入れるほど「あなたらしさ」と切り口の深さが出ます。
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || inputEmpty}
          className="w-full bg-blue-600 text-white text-sm py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? '思考中...' : mode === 'news' ? '投稿候補を生成' : '返信候補を生成'}
        </button>
      </div>

      {result && (
        <div className="mt-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-medium text-amber-700 mb-1">このニュースの本質的な問い</p>
            <p className="text-sm text-gray-800">{result.core_question}</p>
          </div>

          {result.candidates.map((c, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  {c.angle}
                </span>
                <button
                  type="button"
                  onClick={() => copyPost(c.post, `post-${i}`)}
                  className="text-xs text-gray-500 hover:text-gray-800 transition-colors"
                >
                  {copiedKey === `post-${i}` ? 'コピーしました' : '本文をコピー'}
                </button>
              </div>

              <p className="text-xs text-gray-400">1行目（フック）</p>
              <p className="text-sm font-medium text-gray-900 leading-relaxed">{c.hook}</p>

              <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed border-t border-gray-100 pt-3">{c.post}</p>

              <div className="border-t border-gray-100 pt-3 space-y-2 text-xs text-gray-600">
                <p><span className="font-medium text-gray-800">肝（蝶番）:</span> {c.hinge}</p>
                <p><span className="font-medium text-gray-800">反転:</span> {c.reversal}</p>
                <p><span className="font-medium text-gray-800">自己診断:</span> {c.self_check}</p>
              </div>
            </div>
          ))}

          {result.trend_replies?.length > 0 && (
            <div className="space-y-3 pt-2">
              <p className="text-xs font-medium text-gray-500">
                トレンド乗り返信ドラフト（伸びている投稿に返信／引用で被せる用）
              </p>
              {result.trend_replies.map((c, i) => (
                <div key={i} className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">
                      {c.angle}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyPost(c.reply, `trend-${i}`)}
                      className="text-xs text-gray-500 hover:text-gray-800 transition-colors"
                    >
                      {copiedKey === `trend-${i}` ? 'コピーしました' : '本文をコピー'}
                    </button>
                  </div>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{c.reply}</p>
                  <div className="border-t border-green-100 pt-3 text-xs text-gray-600">
                    <p><span className="font-medium text-gray-800">被せ先の例:</span> {c.note}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {replyResult && (
        <div className="mt-6 space-y-4">
          {replyResult.candidates.map((c, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  {c.angle}
                </span>
                <button
                  type="button"
                  onClick={() => copyPost(c.reply, `reply-${i}`)}
                  className="text-xs text-gray-500 hover:text-gray-800 transition-colors"
                >
                  {copiedKey === `reply-${i}` ? 'コピーしました' : '返信をコピー'}
                </button>
              </div>

              <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{c.reply}</p>

              <div className="border-t border-gray-100 pt-3 text-xs text-gray-600">
                <p><span className="font-medium text-gray-800">刺さる理由:</span> {c.note}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
