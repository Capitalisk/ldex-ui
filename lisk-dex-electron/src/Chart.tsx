import React from "react";
import "./App.css";

import * as am4core from "@amcharts/amcharts4/core";
import * as am4charts from "@amcharts/amcharts4/charts";
import am4themes_animated from "@amcharts/amcharts4/themes/animated";
import am4themes_dark from "@amcharts/amcharts4/themes/dark";
import { userContext } from './context';

class Chart extends React.Component<any, any> {
  static contextType = userContext;
  constructor(props, context) {
    super(props, context);
    this.state = {};
  }

  componentDidMount() {
    am4core.useTheme(am4themes_animated);
    am4core.useTheme(am4themes_dark);
    var chart = am4core.create("chart", am4charts.XYChart);

    chart.dataSource.url = `${this.context.configuration.markets[this.context.activeMarket].DEX_API_URL}/orders?sort=price:asc`;

    //chart.dataSource.url = "https://poloniex.com/public?command=returnOrderBook&currencyPair=BTC_ETH&depth=50";
    chart.dataSource.reloadFrequency = 15000;
    chart.dataSource.adapter.add("parsedData", (data) => {
      // Function to process (sort and calculate cummulative volume)
      const processData = (list, type, desc) => {
        // Convert to data points
        for (var i = 0; i < list.length; i++) {
          let currentOrder = list[i];
          let currentOrderPrice = Number(currentOrder.price);
          if (currentOrder.side === 'ask') {
            list[i] = {
              value: currentOrderPrice,
              volume: Number(currentOrder.sizeRemaining) * currentOrderPrice / this.props.whole
            };
          } else {
            list[i] = {
              value: currentOrderPrice,
              volume: Number(currentOrder.valueRemaining) / this.props.whole
            };
          }
        }

        // Sort list just in case
        list.sort(function(a, b) {
          if (a.value > b.value) {
            return 1;
          } else if (a.value < b.value) {
            return -1;
          } else {
            return 0;
          }
        });

        // Calculate cummulative volume
        if (desc) {
          for (let i = list.length - 1; i >= 0; i--) {
            if (i < list.length - 1) {
              list[i].totalvolume = list[i + 1].totalvolume + list[i].volume;
            } else {
              list[i].totalvolume = list[i].volume;
            }
            let dp = {};
            dp["value"] = list[i].value;
            dp[type + "volume"] = list[i].volume;
            dp[type + "totalvolume"] = list[i].totalvolume;
            res.unshift(dp);
          }
        } else {
          for (let i = 0; i < list.length; i++) {
            if (i > 0) {
              list[i].totalvolume = list[i - 1].totalvolume + list[i].volume;
            } else {
              list[i].totalvolume = list[i].volume;
            }
            let dp = {};
            dp["value"] = list[i].value;
            dp[type + "volume"] = list[i].volume;
            dp[type + "totalvolume"] = list[i].totalvolume;
            res.push(dp);
          }
        }
      }

      // Init
      var res = [];

      const bids = [];
      const asks = [];
      let maxSize = { bid: 0, ask: 0 };
      for (let result of data) {
        if (result.side === "bid") {
          bids.push(result);
          if (result.value > maxSize.bid) {
            maxSize.bid = result.value;
          }
        } else if (result.side === "ask") {
          asks.push(result);
          if (result.size > maxSize.ask) {
            maxSize.ask = result.size;
          }
        }
      }
      processData(bids, "bids", true);
      processData(asks, "asks", false);

      return res;
    });

    // Set up precision for numbers
    chart.numberFormatter.numberFormat = "#,###.####";

    // Create axes
    var xAxis = chart.xAxes.push(new am4charts.CategoryAxis());
    xAxis.dataFields.category = "value";
    //xAxis.renderer.grid.template.location = 0;
    xAxis.renderer.minGridDistance = 50;
    xAxis.title.text = `Price (${this.props.currentMarket[0]}/${this.props.currentMarket[1]})`;

    var yAxis = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis.title.text = "Volume (LSK)";

    // Create series
    var series = chart.series.push(new am4charts.StepLineSeries());
    series.dataFields.categoryX = "value";
    series.dataFields.valueY = "bidstotalvolume";
    series.strokeWidth = 2;
    series.stroke = am4core.color("#0f0");
    series.fill = series.stroke;
    series.fillOpacity = 0.1;
    series.tooltipText = "Ask: [bold]{categoryX}[/]\nTotal volume: [bold]{valueY}[/]\nVolume: [bold]{bidsvolume}[/]";

    var series2 = chart.series.push(new am4charts.StepLineSeries());
    series2.dataFields.categoryX = "value";
    series2.dataFields.valueY = "askstotalvolume";
    series2.strokeWidth = 2;
    series2.stroke = am4core.color("#f00");
    series2.fill = series2.stroke;
    series2.fillOpacity = 0.1;
    series2.tooltipText = "Ask: [bold]{categoryX}[/]\nTotal volume: [bold]{valueY}[/]\nVolume: [bold]{asksvolume}[/]";

    var series3 = chart.series.push(new am4charts.ColumnSeries());
    series3.dataFields.categoryX = "value";
    series3.dataFields.valueY = "bidsvolume";
    series3.strokeWidth = 0;
    series3.fill = am4core.color("#000");
    series3.fillOpacity = 0.2;

    var series4 = chart.series.push(new am4charts.ColumnSeries());
    series4.dataFields.categoryX = "value";
    series4.dataFields.valueY = "asksvolume";
    series4.strokeWidth = 0;
    series4.fill = am4core.color("#000");
    series4.fillOpacity = 0.2;

    // Add cursor
    chart.cursor = new am4charts.XYCursor();
  }

  render() {
    return (
      <>
        <div style={{ width: "100%", height: "100%" }} id="chart"></div>
      </>
    );
  }
}

export default Chart;
