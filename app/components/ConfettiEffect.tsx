'use client';

import React, { useEffect, useState } from 'react';
import Confetti from 'react-confetti';

interface ConfettiEffectProps {
  onComplete?: () => void;
}

const ConfettiEffect: React.FC<ConfettiEffectProps> = ({ onComplete }) => {
  const [showConfetti, setShowConfetti] = useState(true);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    // 画面サイズを取得し、Confettiの範囲を決定
    if (typeof window !== 'undefined') {
      setWidth(window.innerWidth);
      // Confettiが画面上部から落ちるように、高さはスクロール可能な高さにするか、適度に調整
      setHeight(window.innerHeight * 1.5); // 画面の1.5倍の高さがあれば十分でしょう
    }

    // 5秒後に花吹雪を停止
    const timer = setTimeout(() => {
      setShowConfetti(false);
      onComplete?.(); // 完了時のコールバックがあれば実行
    }, 5000); // 5秒間表示

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!showConfetti) return null;

  return (
    <Confetti
      width={width}
      height={height}
      numberOfPieces={200} // 控えめな量
      recycle={false} // 一度舞ったら終わり
      gravity={0.15} // ゆっくり落ちる
      run={showConfetti}
      colors={['#A78BFA', '#818CF8', '#C4B5FD', '#EDE9FE']} // 紫系のシンプルで上品な配色
      tweenDuration={5000} // フェードアウトの時間も合わせて滑らかに
      confettiSource={{ // 画面上部全体から降り注ぐように
        x: 0,
        y: 0,
        w: width,
        h: height * 0.1 // 画面上部10%くらいから
      }}
    />
  );
};

export default ConfettiEffect;