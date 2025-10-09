# プロジェクトデバッグ日誌：LINEとSupabaseの戦いの記録

このドキュメントは、LINE BotとSupabaseバックエンドを接続するために行われた広範なデバッグの道のりを記録するものです。

## フェーズ1：最初のLINE連携（そして失敗）

当初の目標は、LINE Botが送信したメッセージをSupabaseデータベースに保存することでした。

* **アプローチ**: Supabase Edge Functionと、サードパーティのDenoライブラリ（`deno.land/x/line`）を使用してLINE Webhookを処理しようとしました。
* **問題**: 一貫して`401 Unauthorized`エラーに遭遇しました。
* **デバッグ手順**:
    * `LINE_CHANNEL_SECRET`と`LINE_CHANNEL_ACCESS_TOKEN`を何度も確認・再設定しました。
    * Supabaseの実行環境が不安定で、秘密鍵が正しく更新されていない可能性があることを突き止めました。
    * 新しいSupabaseインスタンスでプロジェクトを完全に再起動することを試みました。
* **根本原因**: `deno.land/x/line`ライブラリ（SDK）がSupabase Edge Functionの環境と互換性がなく、ログ出力コードが実行される前にクラッシュしていました。

## フェーズ2：Webフォームへの方針転換（そして新たな失敗）

動作するプロトタイプを確立するため、シンプルなWebフォームからデータを送信する方式に切り替えました。

* **アプローチ**: `index.html`ファイルにフォームを設置し、新しいEdge Function (`submit-log`) にデータを送信しました。
* **問題**: これもまた`401 Unauthorized`エラーを引き起こしました。
* **根本原因と解決策**: Supabase Edge Functionは、デフォルトでセキュリティのために`Authorization: Bearer <token>`ヘッダーを要求することを突き止めました。私たちは`apikey`ヘッダーしか送信していませんでした。
* **修正**: `index.html`内の`fetch`呼び出しを更新し、必須の`Authorization`ヘッダーを追加することで、Webフォームの問題は解決しました。

## フェーズ3：LINE連携への再挑戦と最終的な成功

新しい知識を得て、LINE連携に戻りました。

* **最終問題**: デフォルトのセキュリティを`--no-verify-jwt`フラグでバイパスした後も、新たな`500 Internal Server Error`に遭遇。ログから、以前と同じく外部LINE SDKが関数をクラッシュさせていることが判明しました。
* **最終的な解決策**: Claude Codeが、**外部のLINE SDKへの依存を完全に排除する**形で関数を書き直しました。署名検証ロジックを、Denoの標準的な組み込み`crypto`ライブラリを使用して自前で実装しました。これにより、自己完結した信頼性の高い関数が完成しました。

## 最終的に成功したアーキテクチャ

* **Supabase Edge Function (`line-webhook`)**:
    * `--no-verify-jwt`フラグ付きでデプロイし、Supabaseのデフォルトセキュリティをバイパス。
    * Denoネイティブの`crypto`ライブラリを使用して、LINEの`x-line-signature`検証を手動で実行。これが重要なセキュリティチェックとなる。
    * `LINE_CHANNEL_SECRET`を使用して、受信リクエストを検証。
* **LINE Developersコンソール**:
    * Webhook URLはSupabaseの関数を指す。
    * 自動応答とあいさつメッセージは、Botが正しく機能するように**オフ**に設定。
