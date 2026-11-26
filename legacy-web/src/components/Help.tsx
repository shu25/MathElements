import { Icon } from './Icon';
import { MathText } from './MathText';

export function Help({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="help-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="遊び方"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <span className="eyebrow">FIELD NOTES</span>
          <button className="icon-button" aria-label="閉じる" autoFocus onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <h2>触れて、数学を見つける。</h2>
        <p>トレイの記号を、黒い余白へ。</p>
        <div className="help-example">
          <MathText latex="2\quad +\quad 3\;\longrightarrow\;2+3\;\longrightarrow\;5" />
        </div>
        <dl>
          <div>
            <dt>つなぐ</dt>
            <dd>+ を 2 に重ね、できた 2 + □ に 3 を重ねます。</dd>
          </div>
          <div>
            <dt>掛ける</dt>
            <dd>数や式をそのまま重ねると掛け算になります。</dd>
          </div>
          <div>
            <dt>簡約</dt>
            <dd>式をダブルクリック、または選択して Enter。</dd>
          </div>
          <div>
            <dt>分解</dt>
            <dd>右クリック → 分解。選択パネルからも操作できます。</dd>
          </div>
          <div>
            <dt>方程式</dt>
            <dd>方程式を選び、両辺に同じ操作を適用します。</dd>
          </div>
          <div>
            <dt>ベクトル</dt>
            <dd>端点で形を変え、矢印の始点を別の終点につなぎます。</dd>
          </div>
          <div>
            <dt>行列</dt>
            <dd>セルを編集して、座標グリッドにドラッグします。</dd>
          </div>
          <div>
            <dt>物理</dt>
            <dd>m を置き、力や速度を重ねて再生。物体を選ぶと条件を編集できます。</dd>
          </div>
        </dl>
        <div className="help-shortcuts">
          <span>
            <kbd>Ctrl Z</kbd> 元に戻す
          </span>
          <span>
            <kbd>Ctrl Shift Z</kbd> やり直す
          </span>
          <span>
            <kbd>Delete</kbd> 削除
          </span>
          <span>
            <kbd>Esc</kbd> 選択解除
          </span>
        </div>
        <p className="help-accessibility">
          タッチ：ドラッグで移動、選択パネルで簡約・分解。キーボード：Tab で記号を選び、Enter
          で配置。
        </p>
      </section>
    </div>
  );
}
