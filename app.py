from flask import Flask, render_template
import yfinance as yf
import pandas as pd
import numpy as np
import plotly.graph_objs as go
import plotly.io as pio
from datetime import datetime, timedelta

app = Flask(__name__)

def fetch_vix_data():
    """Fetch real-time VIX and S&P 500 data."""
    try:
        vix = yf.Ticker("^VIX")
        sp500 = yf.Ticker("^GSPC")
        
        vix_price = vix.history(period="1d")["Close"].iloc[-1]
        vix_hist = vix.history(period="1y")
        sp500_hist = sp500.history(period="1y")
        
        return vix_price, vix_hist, sp500_hist
    except Exception as e:
        print(f"Error fetching data: {e}")
        return None, None, None

def create_vix_plot(vix_hist, vix_price):
    """Create a Plotly graph for VIX and moving averages."""
    if vix_hist.empty:
        return None
    
    # Use last 200 days for the plot (or less if unavailable)
    plot_data = vix_hist.tail(200).copy()
    dates = plot_data.index
    
    # Calculate moving averages for the plot
    plot_data['9d_MA'] = plot_data['Close'].rolling(window=9).mean()
    plot_data['50d_MA'] = plot_data['Close'].rolling(window=50).mean()
    plot_data['200d_MA'] = plot_data['Close'].rolling(window=200).mean()
    
    # Create Plotly traces
    traces = [
        go.Scatter(
            x=dates, y=plot_data['Close'], name='VIX Price',
            line=dict(color='blue', width=2)
        ),
        go.Scatter(
            x=dates, y=plot_data['9d_MA'], name='9-Day MA',
            line=dict(color='orange', width=1.5, dash='dash')
        ),
        go.Scatter(
            x=dates, y=plot_data['50d_MA'], name='50-Day MA',
            line=dict(color='green', width=1.5, dash='dot')
        ),
        go.Scatter(
            x=dates, y=plot_data['200d_MA'], name='200-Day MA',
            line=dict(color='red', width=1.5, dash='solid')
        ),
        go.Scatter(
            x=[dates[-1]], y=[vix_price], name='Current Price',
            mode='markers', marker=dict(color='black', size=10)
        )
    ]
    
    # Layout
    layout = go.Layout(
        title='VIX Price and Moving Averages',
        xaxis=dict(title='Date'),
        yaxis=dict(title='VIX Value'),
        showlegend=True,
        template='plotly_white',
        height=500
    )
    
    fig = go.Figure(data=traces, layout=layout)
    return pio.to_html(fig, full_html=False, include_plotlyjs='cdn')

def calculate_metrics_and_recommendations(vix_price, vix_hist, sp500_hist):
    """Calculate VIX metrics and provide trading recommendations."""
    metrics = {}
    
    if vix_price is None or vix_hist.empty or sp500_hist.empty:
        return {
            "error": "Failed to fetch data",
            "vix_price": "N/A",
            "vix_9d_ma": "N/A",
            "vix_50d_ma": "N/A",
            "vix_200d_ma": "N/A",
            "vix_sp500_corr": "N/A",
            "recommendations": [],
            "plot": None
        }
    
    metrics["vix_price"] = round(vix_price, 2)
    
    if len(vix_hist["Close"]) >= 9:
        metrics["vix_9d_ma"] = round(vix_hist["Close"].rolling(window=9).mean().iloc[-1], 2)
    else:
        metrics["vix_9d_ma"] = "N/A"
        
    if len(vix_hist["Close"]) >= 50:
        metrics["vix_50d_ma"] = round(vix_hist["Close"].rolling(window=50).mean().iloc[-1], 2)
    else:
        metrics["vix_50d_ma"] = "N/A"
        
    if len(vix_hist["Close"]) >= 200:
        metrics["vix_200d_ma"] = round(vix_hist["Close"].rolling(window=200).mean().iloc[-1], 2)
    else:
        metrics["vix_200d_ma"] = "N/A"
    
    vix_last_30 = vix_hist["Close"].tail(30)
    sp500_last_30 = sp500_hist["Close"].tail(30)
    if len(vix_last_30) == len(sp500_last_30) and len(vix_last_30) >= 30:
        metrics["vix_sp500_corr"] = round(np.corrcoef(vix_last_30, sp500_last_30)[0, 1], 2)
    else:
        metrics["vix_sp500_corr"] = "N/A"
    
    recommendations = []
    if isinstance(metrics["vix_price"], (int, float)):
        if metrics["vix_price"] > 30:
            recommendations.append("VIX is high (>30): Consider selling options (e.g., covered calls or cash-secured puts) to capture high premiums.")
        elif metrics["vix_price"] < 15:
            recommendations.append("VIX is low (<15): Consider buying options (e.g., straddles or strangles) to benefit from potential volatility spikes.")
        else:
            recommendations.append("VIX is moderate (15-30): Neutral market. Consider delta-neutral strategies like iron condors.")
    
    if isinstance(metrics["vix_50d_ma"], (int, float)) and isinstance(metrics["vix_9d_ma"], (int, float)):
        if metrics["vix_price"] > metrics["vix_50d_ma"] and metrics["vix_9d_ma"] > metrics["vix_50d_ma"]:
            recommendations.append("VIX above 50-day MA and rising: Volatility may increase. Consider buying protective puts or VIX calls.")
        elif metrics["vix_price"] < metrics["vix_50d_ma"] and metrics["vix_9d_ma"] < metrics["vix_50d_ma"]:
            recommendations.append("VIX below 50-day MA and falling: Market may be calm. Consider selling options for income.")
    
    if isinstance(metrics["vix_sp500_corr"], (int, float)):
        if metrics["vix_sp500_corr"] < -0.7:
            recommendations.append("Strong negative VIX/S&P 500 correlation: VIX rises when stocks fall. Consider hedging with SPY puts or VIX ETFs.")
        elif metrics["vix_sp500_corr"] > -0.3:
            recommendations.append("Weak VIX/S&P 500 correlation: Unusual market dynamics. Avoid aggressive directional bets; focus on hedging.")
    
    metrics["recommendations"] = recommendations if recommendations else ["No specific recommendations at this time."]
    
    # Generate plot
    metrics["plot"] = create_vix_plot(vix_hist, vix_price)
    
    return metrics

@app.route('/')
def index():
    """Render the main page with VIX metrics, recommendations, and plot."""
    vix_price, vix_hist, sp500_hist = fetch_vix_data()
    metrics = calculate_metrics_and_recommendations(vix_price, vix_hist, sp500_hist)
    return render_template('index.html', metrics=metrics)

if __name__ == '__main__':
    app.run(debug=True)