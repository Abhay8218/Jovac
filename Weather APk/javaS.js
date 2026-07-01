const searchBtn = document.getElementById("searchBtn");
const weatherResult = document.getElementById("weatherResult");
const newsResult = document.getElementById("newsResult");

searchBtn.addEventListener("click", async () => {

    const city = document.getElementById("cityInput").value.trim();

    if (!city) return;
    try {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();
        
        // console.log(geoData);
        // console.log(geoData.results[0]);
        

        if (!geoData.results || geoData.results.length === 0) {
            weatherResult.innerHTML = "City not found";
            newsResult.innerHTML = "";
            return;
        }

        const { latitude, longitude, name, country } = geoData.results[0];

        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m`;
        const weatherResponse = await fetch(weatherUrl);
        const data = await weatherResponse.json();

        const temp = data.current.temperature_2m;

        weatherResult.innerHTML = `
            <h3>${name}, ${country}</h3>
            <p>Temperature: ${temp} °C</p>
        `;

    } catch (error) {
        
        console.log(error);
    }

    try {
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(city)}&hl=en-IN&gl=IN&ceid=IN:en`;
        const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

        const response = await fetch(proxyUrl);
        const data = await response.json();

        newsResult.innerHTML = `<h3>Latest News</h3>` + data.items.slice(0, 5).map(item => `
            <div class="news-card">
                <a href="${item.link}" target="_blank">${item.title}</a>
                <p>${item.author || "Google News"} &bull; ${new Date(item.pubDate).toDateString()}</p>
            </div>
        `).join("");

    } catch (error) {
        newsResult.innerHTML = "No news available";
        console.log(error);
    }
});