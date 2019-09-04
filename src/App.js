// Base on Credit
// [Tutorial](https://codedaily.io/tutorials/39/Make-a-Beautiful-Interactive-Bitcoin-Price-Chart-with-React-D3-and-VX)
// [Live Demo](https://codesandbox.io/s/github/codedailyio/bitcoin_chart)
// Modified by @ttanachot
import React from "react";
import { Line, Bar, LinePath } from "@vx/shape";
import { withTooltip, Tooltip } from "@vx/tooltip";
import { localPoint } from "@vx/event";
import { scaleTime, scaleLinear } from "@vx/scale";
import { extent, max, bisector } from "d3-array";
import { timeFormat } from "d3-time-format";
import { branch, compose, lifecycle, onlyUpdateForKeys, renderComponent, withProps, withState, withHandlers } from "recompose";

const width = window.innerWidth;
const height = window.innerHeight;
const formatDate = timeFormat("%b %d, '%y");
const xSelector = d => new Date(d.date);
const ySelector = d => d.price;
const bisectDate = bisector(xSelector).left;

const withStates = withState('data', 'setData', null);

const withChartHandlers = withHandlers({
  handleTooltip: (props) => ({ event, data }) => {
    const { showTooltip, xScale, yScale } = props;
    const { x } = localPoint(event);
    const x0 = xScale.invert(x);
    const index = bisectDate(data, x0, 1);
    const d0 = data[index - 1];
    const d1 = data[index];
    let d = d0;
    if (d1 && d1.date) {
      d = x0 - xSelector(d0) > xSelector(d1) - x0 ? d1 : d0;
    }
    showTooltip({
      tooltipData: d,
      tooltipLeft: xScale(xSelector(d)),
      tooltipTop: yScale(ySelector(d)),
    });
  }
});

const withLifecycle = lifecycle({
  componentWillMount() {
    fetch("https://api.coindesk.com/v1/bpi/historical/close.json")
      .then(res => res.json())
      .then(jsonData => {
        const data = Object.keys(jsonData.bpi).map(date => ({ date, price: jsonData.bpi[date] }));
        this.props.setData(data);
      });
  }
});

const LoadingComponent = () => <div>...Loading</div>;
const withLoading = branch(({ data }) => (data === null), renderComponent(LoadingComponent));

const withChartProps = withProps(({ data }) => {
  const padding = 100;
  const xMax = width - padding;
  const yMax = height - padding;

  const xScale = scaleTime({
    range: [padding, xMax],
    domain: extent(data, xSelector),
  });

  const dataMax = max(data, ySelector);
  const yScale = scaleLinear({
    range: [yMax, padding],
    domain: [0, dataMax + dataMax / 3],
  });

  return { xMax, yMax, xScale, yScale };
});

const withOnlyUpdateForKeys = onlyUpdateForKeys(['data', 'tooltipData']);

const App = ({
  data, showTooltip, hideTooltip, handleTooltip,
  tooltipData, tooltipTop, tooltipLeft,
  xMax, yMax, xScale, yScale,
}) => (
  <div>
    <svg width={width} height={height}>
      <rect x={0} y={0} width={width} height={height} fill="#6CC4EE" />
      <LinePath
        data={data}
        xScale={xScale}
        yScale={yScale}
        x={xSelector}
        y={ySelector}
        strokeWidth={5}
        stroke="#FFF"
        strokeLinecap="round"
        fill="transparent"
      />
      <Bar
        x={0}
        y={0}
        width={width}
        height={height}
        fill="transparent"
        data={data}
        onMouseMove={data => event => handleTooltip({ event, data })}
        onMouseLeave={data => event => hideTooltip()}
        onTouchEnd={data => event => hideTooltip()}
        onTouchMove={data => event => handleTooltip({ event, data })}
      />
      {tooltipData && (
        <g>
          <Line
            from={{ x: tooltipLeft, y: 0 }}
            to={{ x: tooltipLeft, y: yMax }}
            stroke="#5C77EB"
            strokeWidth={4}
            style={{ pointerEvents: "none" }}
            strokeDasharray="4,6"
          />
          <circle
            cx={tooltipLeft}
            cy={tooltipTop}
            r={4}
            fill="#5C77EB"
            stroke="white"
            strokeWidth={2}
            style={{ pointerEvents: "none" }}
          />
        </g>
      )}
    </svg>
    {tooltipData && (
      <div>
        <Tooltip
          top={tooltipTop - 12}
          left={tooltipLeft + 12}
          style={{ backgroundColor: "#5C77EB", color: "#FFF" }}
        >
          {`$${ySelector(tooltipData)}`}
        </Tooltip>
        <Tooltip
          top={yMax - 30}
          left={tooltipLeft}
          style={{ transform: "translateX(-50%)" }}
        >
          {formatDate(xSelector(tooltipData))}
        </Tooltip>
      </div>
    )}
  </div>
);

const enhance = compose(
  withTooltip,
  withStates,
  withLifecycle,
  withLoading,
  withChartProps,
  withChartHandlers,
  withOnlyUpdateForKeys,
);

export default enhance(App);
