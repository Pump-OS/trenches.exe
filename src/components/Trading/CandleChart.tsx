// ============================================================
// Candle Chart — TradingView lightweight-charts v5 wrapper
// Supports: migration price line, AVG entry price line,
// and buy/sell trade markers
// ============================================================

import { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, createSeriesMarkers } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, Time, IPriceLine, SeriesMarker, ISeriesMarkersPluginApi } from 'lightweight-charts';
import type { Candle, Timeframe } from '../../engine/candleAggregator';

export interface TradeMarker {
  time: number;     // Unix timestamp seconds
  type: 'buy' | 'sell';
  price: number;
  label: string;    // e.g. "1.0 SOL"
}

interface CandleChartProps {
  candles: Candle[];
  timeframe: Timeframe;
  migrationPrice?: number;
  avgEntryPrice?: number;
  tradeMarkers?: TradeMarker[];
}

export const CandleChart = ({
  candles, timeframe, migrationPrice, avgEntryPrice, tradeMarkers,
}: CandleChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const migrationLineRef = useRef<IPriceLine | null>(null);
  const avgLineRef = useRef<IPriceLine | null>(null);
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const prevCandleCountRef = useRef(0);
  const isUserScrolledRef = useRef(false);
  const prevTokenKeyRef = useRef('');

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#0d0d1a' },
        textColor: '#a0a0b0',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: '#1a1a2e' },
        horzLines: { color: '#1a1a2e' },
      },
      crosshair: {
        vertLine: { color: '#4da6ff', width: 1, style: 2 },
        horzLine: { color: '#4da6ff', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: '#2a2a3e',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: '#2a2a3e',
        timeVisible: true,
        secondsVisible: true,
      },
      handleScroll: true,
      handleScale: true,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#00ff41',
      downColor: '#ff3131',
      borderUpColor: '#00ff41',
      borderDownColor: '#ff3131',
      wickUpColor: '#00ff41',
      wickDownColor: '#ff3131',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // Create markers plugin
    markersPluginRef.current = createSeriesMarkers(series, []);

    // Track if user has manually scrolled away from the right edge
    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      const scrollPos = chart.timeScale().scrollPosition();
      // scrollPosition < -2 means user scrolled left away from live edge
      isUserScrolledRef.current = scrollPos < -2;
    });

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    const ro = new ResizeObserver(handleResize);
    ro.observe(containerRef.current);
    handleResize();

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      migrationLineRef.current = null;
      avgLineRef.current = null;
      markersPluginRef.current = null;
    };
  }, []);

  // Update candle data
  // setData() ONLY on token/timeframe switch. Everything else via update().
  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return;

    const tokenKey = `${candles[0]?.time}_${timeframe}`;
    const isNewToken = tokenKey !== prevTokenKeyRef.current;
    prevTokenKeyRef.current = tokenKey;

    if (isNewToken) {
      // Full reset — new token or timeframe
      seriesRef.current.setData(candles.map(c => ({
        time: c.time as Time,
        open: c.open, high: c.high, low: c.low, close: c.close,
      })));
      prevCandleCountRef.current = candles.length;
      isUserScrolledRef.current = false;
      chartRef.current?.timeScale().scrollToRealTime();
      return;
    }

    // Incremental: update() handles both updating last candle AND adding new ones.
    // It NEVER resets scroll position.
    const last = candles[candles.length - 1];
    if (last) {
      seriesRef.current.update({
        time: last.time as Time,
        open: last.open, high: last.high, low: last.low, close: last.close,
      });
    }
    prevCandleCountRef.current = candles.length;
  }, [candles, timeframe]);

  // Migration price line
  useEffect(() => {
    if (!seriesRef.current) return;

    if (migrationLineRef.current) {
      seriesRef.current.removePriceLine(migrationLineRef.current);
      migrationLineRef.current = null;
    }

    if (migrationPrice) {
      migrationLineRef.current = seriesRef.current.createPriceLine({
        price: migrationPrice,
        color: '#4da6ff',
        lineWidth: 1,
        lineStyle: 2, // dashed
        axisLabelVisible: true,
        title: 'MIGRATION $1.00',
      });
    }
  }, [migrationPrice]);

  // AVG entry price line
  useEffect(() => {
    if (!seriesRef.current) return;

    if (avgLineRef.current) {
      seriesRef.current.removePriceLine(avgLineRef.current);
      avgLineRef.current = null;
    }

    if (avgEntryPrice && avgEntryPrice > 0) {
      avgLineRef.current = seriesRef.current.createPriceLine({
        price: avgEntryPrice,
        color: '#ffd700',
        lineWidth: 1,
        lineStyle: 1, // dotted
        axisLabelVisible: true,
        title: `AVG $${avgEntryPrice.toFixed(4)}`,
      });
    }
  }, [avgEntryPrice]);

  // Trade markers (buy/sell arrows on chart)
  useEffect(() => {
    if (!markersPluginRef.current) return;

    if (!tradeMarkers || tradeMarkers.length === 0) {
      markersPluginRef.current.setMarkers([]);
      return;
    }

    const markers: SeriesMarker<Time>[] = tradeMarkers
      .sort((a, b) => a.time - b.time)
      .map(m => ({
        time: m.time as Time,
        position: m.type === 'buy' ? 'belowBar' as const : 'aboveBar' as const,
        shape: m.type === 'buy' ? 'arrowUp' as const : 'arrowDown' as const,
        color: m.type === 'buy' ? '#00ff41' : '#ff3131',
        text: m.label,
      }));

    markersPluginRef.current.setMarkers(markers);
  }, [tradeMarkers]);

  // Update timeScale when timeframe changes
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({
      timeScale: {
        timeVisible: true,
        secondsVisible: timeframe === '1s' || timeframe === '5s',
      },
    });
  }, [timeframe]);

  return (
    <div
      ref={containerRef}
      className="chart-container"
      style={{ width: '100%', height: '100%' }}
    />
  );
};
