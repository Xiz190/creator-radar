"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 路由一变就从头播一遍进度条：这是对外部事件（导航）的同步，effect 里设状态是本意
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
    setWidth(15);
    const t1 = setTimeout(() => setWidth(40), 80);
    const t2 = setTimeout(() => setWidth(75), 250);
    const t3 = setTimeout(() => {
      setWidth(100);
      setTimeout(() => { setVisible(false); setWidth(0); }, 250);
    }, 500);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [pathname, searchParams]);

  if (!visible && width === 0) return null;

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-[200] h-0.5 transition-all duration-200 ease-out"
      style={{ width: `${width}%`, backgroundColor: "var(--brand)", opacity: visible ? 1 : 0 }}
    />
  );
}

// useSearchParams 必须包在 Suspense 里，否则生产构建静态生成会报错（missing-suspense-with-csr-bailout）
export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}
