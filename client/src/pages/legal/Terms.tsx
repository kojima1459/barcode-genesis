import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Terms() {
    return (
        <div className="min-h-screen bg-background py-10 px-4 animate-in fade-in duration-500">
            <div className="max-w-3xl mx-auto space-y-8 bg-card border rounded-lg p-8 shadow-sm">
                <h1 className="text-2xl font-bold mb-6">利用規約</h1>
                <div className="space-y-6 text-sm">
                    <p>この利用規約（以下，「本規約」といいます。）は，UNSEVED:LAB（以下，「当方」といいます。）が提供するサービス（以下，「本サービス」といいます。）の利用条件を定めるものです。登録ユーザーの皆さま（以下，「ユーザー」といいます。）には，本規約に従って，本サービスをご利用いただきます。</p>

                    <h2 className="text-lg font-bold mt-4">第1条（適用）</h2>
                    <p>本規約は，ユーザーと当方との間の本サービスの利用に関わる一切の関係に適用されるものとします。</p>

                    <h2 className="text-lg font-bold mt-4">第2条（利用登録）</h2>
                    <p>登録希望者が当方の定める方法によって利用登録を申請し，当方がこれを承認することによって，利用登録が完了するものとします。</p>

                    <h2 className="text-lg font-bold mt-4">第3条（禁止事項）</h2>
                    <p>ユーザーは，本サービスの利用にあたり，以下の行為をしてはなりません。</p>
                    <ul className="list-disc list-inside space-y-1 pl-4">
                        <li>法令または公序良俗に違反する行為</li>
                        <li>犯罪行為に関連する行為</li>
                        <li>当方，本サービスの他のユーザー，または第三者のサーバーまたはネットワークの機能を破壊したり，妨害したりする行為</li>
                        <li>当方のサービスの運営を妨害するおそれのある行為</li>
                    </ul>

                    <h2 className="text-lg font-bold mt-4">第4条（免責事項）</h2>
                    <p>当方は，本サービスに事実上または法律上の瑕疵（安全性，信頼性，正確性，完全性，有効性，特定の目的への適合性，セキュリティなどに関する欠陥，エラーやバグ，権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。</p>
                </div>
                <div className="pt-8 text-center">
                    <Link href="/">
                        <Button variant="outline">トップへ戻る</Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
