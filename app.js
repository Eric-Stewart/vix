const express = require('express');
const yahooFinance = require('yahoo-finance2').default;
const path = require('path');

const app = express();
const port = 3000;

// Set EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files (if needed)
app.use(express.static(path.join(__dirname, 'public')));

async function fetchVixData() {
    try {
        // Fetch real-time VIX price (latest close)
        const vixQuote = await yahooFinance.quote('^VIX');
        const vixPrice = vixQuote.regularMarketPrice;

        // Fetch 1 year of historical data (approx. 252 trading days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - 1);

        const vixHist = await yahooFinance.historical('^VIX', {
            period1: startDate,
            period2: endDate,
            interval: '1d'
        });
        const sp500Hist = await yahooFinance.historical('^GSPC', {
            period1: startDate,
            period2: endDate,
            interval: '1d'
        });

        return { vixPrice, vixHist, sp500Hist };
    } catch (e) {
        console.error(`Error fetching data: ${e}`);
        return { vixPrice: null, vixHist: [], sp500Hist: [] };
    }
}

function calculateMovingAverage(data, window) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
        if (i < window - 1) {
            result.push(null);
            continue;
        }
        const slice = data.slice(i - window + 1, i + 1);
        const avg = slice.reduce((sum, val) => sum + val, 0) / window;
        result.push(avg);
    }
    return result;
}

function calculateMetricsAndRecommendations(vixPrice, vixHist, sp500Hist) {
    const metrics = {};

    if (!vixPrice || vixHist.length === 0 || sp500Hist.length === 0) {
        return {
            error: 'Failed to fetch data',
            vixPrice: 'N/A',
            vix9dMa: 'N/A',
            vix50dMa: 'N/A',
            vix200dMa: 'N/A',
            vixSp500Corr: 'N/A',
            recommendations: [],
            plotData: null
        };
    }

    // Current VIX price
    metrics.vixPrice = vixPrice.toFixed(2);

    // Extract closing prices
    const vixCloses = vixHist.map(d => d.close);
    const sp500Closes = sp500Hist.map(d => d.close);

    // Moving averages
    metrics.vix9dMa = vixCloses.length >= 9
        ? calculateMovingAverage(vixCloses, 9).slice(-1)[0].toFixed(2)
        : 'N/A';
    metrics.vix50dMa = vixCloses.length >= 50
        ? calculateMovingAverage(vixCloses, 50).slice(-1)[0].toFixed(2)
        : 'N/A';
    metrics.vix200dMa = vixCloses.length >= 200
        ? calculateMovingAverage(vixCloses, 200).slice(-1)[0].toFixed(2)
        : 'N/A';

    // VIX/S&P 500 correlation (last 30 days)
    if (vixCloses.length >= 30 && sp500Closes.length >= 30) {
        const vixLast30 = vixCloses.slice(-30);
        const sp500Last30 = sp500Closes.slice(-30);
        const meanVix = vixLast30.reduce((sum, val) => sum + val, 0) / 30;
        const meanSp500 = sp500Last30.reduce((sum, val) => sum + val, 0) / 30;
        let cov = 0, vixVar = 0, sp500Var = 0;
        for (let i = 0; i < 30; i++) {
            const vixDiff = vixLast30[i] - meanVix;
            const sp500Diff = sp500Last30[i] - meanSp500;
            cov += vixDiff * sp500Diff;
            vixVar += vixDiff * vixDiff;
            sp500Var += sp500Diff * sp500Diff;
        }
        cov /= 30;
        vixVar /= 30;
        sp500Var /= 30;
        metrics.vixSp500Corr = vixVar > 0 && sp500Var > 0
            ? (cov / Math.sqrt(vixVar * sp500Var)).toFixed(2)
            : 'N/A';
    } else {
        metrics.vixSp500Corr = 'N/A';
    }

    // Recommendations
    const recommendations = [];
    const priceNum = parseFloat(metrics.vixPrice);
    if (!isNaN(priceNum)) {
        if (priceNum > 30) {
            recommendations.push('VIX is high (>30): Consider selling options (e.g., covered calls or cash-secured puts) to capture high premiums.');
        } else if (priceNum < 15) {
            recommendations.push('VIX is low (<15): Consider buying options (e.g., straddles or strangles) to benefit from potential volatility spikes.');
        } else {
            recommendations.push('VIX is moderate (15-30): Neutral market. Consider delta-neutral strategies like iron condors.');
        }
    }

    const vix9dNum = parseFloat(metrics.vix9dMa);
    const vix50dNum = parseFloat(metrics.vix50dMa);
    if (!isNaN(vix9dNum) && !isNaN(vix50dNum)) {
        if (priceNum > vix50dNum && vix9dNum > vix50dNum) {
            recommendations.push('VIX above 50-day MA and rising: Volatility may increase. Consider buying protective puts or VIX calls.');
        } else if (priceNum < vix50dNum && vix9dNum < vix50dNum) {
            recommendations.push('VIX below 50-day MA and falling: Market may be calm. Consider selling options for income.');
        }
    }

    const corrNum = parseFloat(metrics.vixSp500Corr);
    if (!isNaN(corrNum)) {
        if (corrNum < -0.7) {
            recommendations.push('Strong negative VIX/S&P 500 correlation: VIX rises when stocks fall. Consider hedging with SPY puts or VIX ETFs.');
        } else if (corrNum > -0.3) {
            recommendations.push('Weak VIX/S&P 500 correlation: Unusual market dynamics. Avoid aggressive directional bets; focus on hedging.');
        }
    }

    metrics.recommendations = recommendations.length > 0 ? recommendations : ['No specific recommendations at this time.'];

    // Prepare plot data (last 200 days)
    const plotLength = Math.min(vixHist.length, 200);
    const plotData = vixHist.slice(-plotLength);
    const dates = plotData.map(d => new Date(d.date).toISOString().split('T')[0]);
    const closes = plotData.map(d => d.close);
    const ma9 = calculateMovingAverage(closes, 9);
    const ma50 = calculateMovingAverage(closes, 50);
    const ma200 = calculateMovingAverage(closes, 200);

    metrics.plotData = {
        dates,
        closes,
        ma9,
        ma50,
        ma200,
        currentPrice: vixPrice,
        currentDate: dates[dates.length - 1]
    };

    return metrics;
}

app.get('/', async (req, res) => {
    const { vixPrice, vixHist, sp500Hist } = await fetchVixData();
    const metrics = calculateMetricsAndRecommendations(vixPrice, vixHist, sp500Hist);
    res.render('index', { metrics });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});