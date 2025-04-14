# VIX and S&P 500 Analysis Web App

## Overview

This web application, built with Flask, fetches and analyzes VIX (CBOE Volatility Index) and S&P 500 data to provide insights and trading recommendations. It calculates various metrics, visualizes VIX trends, and suggests potential options trading strategies.

## Features

* **Real-time Data:** Fetches VIX and S&P 500 data using the yfinance library.
* **VIX Plot:** Generates an interactive plot of VIX price with 9-day, 50-day, and 200-day moving averages using Plotly.
* **Key Metrics:** Calculates and displays the following VIX metrics:
    * Current VIX price
    * 9-day, 50-day, and 200-day moving averages
    * Correlation between VIX and S&P 500 over the past 30 days
* **Trading Recommendations:** Provides trading recommendations based on VIX level, moving average relationships, and VIX/S&P 500 correlation.  The recommendations are tailored for options trading.
* **Web Interface:** Presents the data, plot, and recommendations in a user-friendly web interface using Flask and Jinja templating.

## Technologies Used

* **Flask:** Web framework
* **yfinance:** Data retrieval
* **pandas:** Data manipulation
* **numpy:** Numerical calculations
* **Plotly:** Interactive plotting
* **HTML:** Templating

## Setup

1.  **Prerequisites:**
    * Python 3.x
    * pip (Python package installer)

2.  **Installation:**

    * Clone the repository.
    * Create a virtual environment (recommended):
        ```bash
        python -m venv venv
        ```
    * Activate the virtual environment:
        * On Windows:
            ```bash
            venv\Scripts\activate
            ```
        * On macOS and Linux:
            ```bash
            source venv/bin/activate
            ```
    * Install the required packages:
        ```bash
        pip install -r requirements.txt
        ```

3.  **Running the Application:**

    * Navigate to the application directory.
    * Run the Flask application:
        ```bash
        python app.py
        ```
    * Open your web browser and go to `http://127.0.0.1:5000/` to view the application.

##  Code Description

* `app.py`:
    * `fetch_vix_data()`:  Fetches VIX and S&P 500 data from Yahoo Finance.  Handles potential errors during data retrieval.
    * `create_vix_plot()`:  Generates a Plotly chart of VIX data, including moving averages.  Handles cases where VIX data is missing.
    * `calculate_metrics_and_recommendations()`:  Calculates VIX metrics (price, moving averages, correlation) and generates options trading recommendations based on these metrics.
    * `index()`:  Flask route that fetches data, calculates metrics, and renders the `index.html` template.
* `templates/index.html`:
    * HTML template to display the VIX plot, metrics, and trading recommendations. Uses Jinja templating to inject data from the Flask application.

##  Dependencies

The application uses the following Python packages:

* Flask
* yfinance
* pandas
* numpy
* plotly

The specific versions are listed in the `requirements.txt` file.

##  Disclaimer

The trading recommendations provided by this application are for informational purposes only and should not be considered financial advice.  Options trading involves substantial risk of loss.  Consult with a qualified financial advisor before making any investment decisions.
