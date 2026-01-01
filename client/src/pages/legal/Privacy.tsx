import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Privacy() {
    return (
        <div className="min-h-screen bg-background py-10 px-4 animate-in fade-in duration-500">
            <div className="max-w-3xl mx-auto space-y-8 bg-card border rounded-lg p-8 shadow-sm">
                <h1 className="text-2xl font-bold mb-6">プライバシーポリシー</h1>
                <div className="space-y-6 text-sm">
                    <p>UNSEVED:LAB（以下、「当方」）は、提供するアプリケーションサービス（以下、「本サービス」）における、ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下、「本ポリシー」）を定めます。</p>

                    <h2 className="text-lg font-bold mt-4">1. 個人情報の定義</h2>
                    <p>「個人情報」とは、個人情報保護法にいう「個人情報」を指すものとし、生存する個人に関する情報であって、当該情報に含まれる氏名、生年月日、住所、電話番号、連絡先その他の記述等により特定の個人を識別できる情報（個人識別情報）を指します。</p>

                    <h2 className="text-lg font-bold mt-4">2. 個人情報の収集方法</h2>
                    <p>当方は、ユーザーが利用登録をする際に氏名、メールアドレスなどの個人情報をお尋ねすることがあります。また、ユーザーと提携先などとの間でなされたユーザーの個人情報を含む取引記録や決済に関する情報を、当方の提携先（情報提供元、広告主、広告配信先などを含みます。）などから収集することがあります。</p>

                    <h2 className="text-lg font-bold mt-4">3. 個人情報を収集・利用する目的</h2>
                    <p>当方が個人情報を収集・利用する目的は、以下のとおりです。</p>
                    <ul className="list-disc list-inside space-y-1 pl-4">
                        <li>本サービスの提供・運営のため</li>
                        <li>ユーザーからのお問い合わせに回答するため</li>
                        <li>メンテナンス、重要なお知らせなど必要に応じたご連絡のため</li>
                        <li>利用規約に違反したユーザーや、不正・不当な目的で本サービスを利用しようとするユーザーの特定をし、ご利用をお断りするため</li>
                    </ul>

                    <h2 className="text-lg font-bold mt-4">4. お問い合わせ窓口</h2>
                    <p>本ポリシーに関するお問い合わせは、下記の窓口までお願いいたします。</p>
                    <p className="mt-2">UNSEVED:LAB<br />E-mail: mk19830920@gmail.com</p>
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
