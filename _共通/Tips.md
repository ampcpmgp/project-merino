- [Tips](#tips)
  - [歌詞作成](#歌詞作成)
    - [プロンプト例](#プロンプト例)
      - [適切な感情タグ](#適切な感情タグ)
      - [歌詞のリライト](#歌詞のリライト)
      - [漢字・カタカナ・絵文字の追加](#漢字カタカナ絵文字の追加)
      - [絵文字の削除](#絵文字の削除)
      - [歌詞のひらがな変換](#歌詞のひらがな変換)
      - [要点を残し340文字以内に調整](#要点を残し340文字以内に調整)


# Tips

## 歌詞作成

- ひらがな330文字以内に抑えると曲が良くなるっぽい？
- 「は」を「わ」というときはカタカナにすることも検討する。


### プロンプト例

#### 適切な感情タグ

````md
以下の歌詞の各フレーズごとに、

```lyrics
<歌詞を入力>
```

以下の最も適切な感情タグを挿入してください

```emotion tag
[Bittersweet][Dark][Emotional][Relaxing][Romantic][Soothing][Vibrant][eerie][Ambiguous][Angry][Brooding][Calm][Celebratory][Comforting][Dirty][Dream][Dreamy][Energetic][Epic][Ethereal][Exhilarating][Festive][Frantic][Fun][Hopeful][Intense][Jovial][Joyful][Lighthearted][singing][Melancholy][Melodramatic][Mysterious][Mystical][Nostalgic][Optimistic][Passionate][Pessimistic][Playful][Progressive][Reflective][Regal][Regret][Sentimental][Somber][Tense][Triumphant][Uplifting][Whimsical]
```
````

#### 歌詞のリライト

````md
以下の歌詞の伝えたいことはそのままに、別な歌詞を考えてください。ひらがなのままでお願いします。

```lyrics
<歌詞を入力>
```
````

#### 漢字・カタカナ・絵文字の追加

````md
以下の歌詞に漢字・カタカナ・絵文字を適切に追加して自然な表現にしてください

```lyrics
<歌詞を入力>
```
````

#### 絵文字の削除

````md
以下の歌詞から絵文字を削除してください。

```lyrics
<歌詞を入力>
```
````

#### 歌詞のひらがな変換

````md
以下の日本語を全てひらがなに変換してください。

```lyrics
<歌詞入力>
```
````

#### 要点を残し340文字以内に調整

````md

```md
要点を残し、340文字以内に調整してもらえますか？
```

#### メタタグの追加

````
```md
以下の歌詞を用いて、SunoAIが魅力的な楽曲を作れるように様々なメタタグを入れてください。

```lyrics
<歌詞を入力>
```
````

