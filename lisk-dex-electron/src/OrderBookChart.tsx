import React from 'react';
import './App.css';

import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import am4themes_dark from '@amcharts/amcharts4/themes/dark';
import { userContext } from './context';

class OrderBookChart extends React.Component<any, any> {
  static contextType = userContext;
  chart = null;
  constructor(props, context) {
    super(props, context);
    this.state = {};
  }

  refreshOrderData() {
    if (!this.chart) {
      return;
    }
    let bids = [...this.props.orderBookData.bids];
    let asks = [...this.props.orderBookData.asks];

    let bidPriceMap = new Map();
    let bidsTotalVolume = 0;

    for (let bid of bids) {
      let existingEntry = bidPriceMap.get(bid.price) || {bidsvolume: 0};
      let volume = Number(bid.valueRemaining) / this.props.whole;
      bidsTotalVolume += volume;

      bidPriceMap.set(bid.price, {
        value: bid.price,
        bidsvolume: existingEntry.bidsvolume + volume,
        bidstotalvolume: bidsTotalVolume
      });
    }

    let askPriceMap = new Map();
    let asksTotalVolume = 0;

    for (let ask of asks) {
      let existingEntry = askPriceMap.get(ask.price) || {asksvolume: 0};
      let volume = Number(ask.sizeRemaining) * ask.price / this.props.whole;
      asksTotalVolume += volume;

      askPriceMap.set(ask.price, {
        value: ask.price,
        asksvolume: existingEntry.asksvolume + volume,
        askstotalvolume: asksTotalVolume
      });
    }

    this.chart.data = [...[...bidPriceMap.values()].reverse(), ...askPriceMap.values()];
  };

  componentDidMount() {
    am4core.useTheme(am4themes_animated);
    am4core.useTheme(am4themes_dark);
    let chart = am4core.create('chart', am4charts.XYChart);
    this.chart = chart;

    // Set up precision for numbers
    chart.numberFormatter.numberFormat = '#,###.####';

    // Create axes
    let xAxis = chart.xAxes.push(new am4charts.CategoryAxis());
    xAxis.dataFields.category = 'value';
    //xAxis.renderer.grid.template.location = 0;
    xAxis.renderer.minGridDistance = 50;
    xAxis.title.text = `Price (${this.props.activeAssets[0].toUpperCase()}/${this.props.activeAssets[1].toUpperCase()})`;

    let yAxis = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis.title.text = 'Volume (LSK)';

    // Create series
    let series = chart.series.push(new am4charts.StepLineSeries());
    series.dataFields.categoryX = 'value';
    series.dataFields.valueY = 'bidstotalvolume';
    series.strokeWidth = 2;
    series.stroke = am4core.color('#0e0');
    series.fill = series.stroke;
    series.fillOpacity = 0.1;
    series.tooltipText = 'Bid: [bold]{categoryX}[/]\nTotal volume: [bold]{valueY}[/]\nVolume: [bold]{bidsvolume}[/]';

    let series2 = chart.series.push(new am4charts.StepLineSeries());
    series2.dataFields.categoryX = 'value';
    series2.dataFields.valueY = 'askstotalvolume';
    series2.strokeWidth = 2;
    series2.stroke = am4core.color('#e00');
    series2.fill = series2.stroke;
    series2.fillOpacity = 0.1;
    series2.tooltipText = 'Ask: [bold]{categoryX}[/]\nTotal volume: [bold]{valueY}[/]\nVolume: [bold]{asksvolume}[/]';

    let series3 = chart.series.push(new am4charts.ColumnSeries());
    series3.dataFields.categoryX = 'value';
    series3.dataFields.valueY = 'bidsvolume';
    series3.strokeWidth = 0;
    series3.fill = am4core.color('#000');
    series3.fillOpacity = 0.2;

    let series4 = chart.series.push(new am4charts.ColumnSeries());
    series4.dataFields.categoryX = 'value';
    series4.dataFields.valueY = 'asksvolume';
    series4.strokeWidth = 0;
    series4.fill = am4core.color('#000');
    series4.fillOpacity = 0.2;

    // Add cursor
    chart.cursor = new am4charts.XYCursor();
  }

  render() {
    this.refreshOrderData();

    return (
      <>
        <div style={{ width: '100%', height: '100%' }} id="chart"></div>
      </>
    );
  }
}

export default OrderBookChart;
