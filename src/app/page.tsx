import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bitcoin to iPhone Calculator | btc2iphone.com",
  description:
    "Calculate how much bitcoin you need to buy an iPhone. Bitcoin to iPhone exchange rate calculator.",
  keywords: "bitcoin, iPhone, calculator, exchange rate",

  openGraph: {
    title: "Bitcoin to iPhone Calculator | btc2iphone.com",
    description:
      "Calculate how much bitcoin you need to buy an iPhone. Bitcoin to iPhone exchange rate calculator.",
    url: "https://btc2iphone.com",

    type: "website",
    images: [
      {
        url: "https://btc2iphone.com/iphone.png",
        width: 1200,
        height: 630,
        alt: "Bitcoin to iPhone Calculator | btc2iphone.com",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bitcoin to iPhone Calculator | btc2iphone.com",
    description:
      "Calculate how much bitcoin you need to buy an iPhone. Bitcoin to iPhone exchange rate calculator.",
  },
};

async function getBitcoinPrice() {
  const res = await fetch("https://api.coindesk.com/v1/bpi/currentprice.json");
  // get Iphone price from https://www.apple.com/shop/buy-iphone/iphone-15

  const data = await res.json();
  return data.bpi.USD.rate_float;
}

export default async function Home() {
  const price = (await getBitcoinPrice()) || 1;
  const latestIphoneprice = 899;
  // round to 2 decimal places
  const price2 = Math.round((latestIphoneprice / price) * 100) / 100;
  const events = [
    { year: 2011, description: "162 BTC ", model: "iPhone 4s " },
    { year: 2012, description: "53 BTC", model: "Iphone 5" },
    { year: 2013, description: "5 BTC", model: "iPhone 5s " },
    { year: 2014, description: "1.7 BTC", model: "iPhone 6" },
    { year: 2015, description: "2.8 BTC", model: "iPhone 6s" },
    { year: 2016, description: "1.1 BTC", model: "iPhone 7 " },
    { year: 2017, description: "0.19 BTC", model: "iPhone 8 " },
    { year: 2017, description: "0.14 BTC", model: "iPhone X " },
    { year: 2018, description: "0.15 BTC", model: "iPhone XS" },
    { year: 2019, description: "0.068 BTC", model: "iPhone 11 " },
    { year: 2020, description: "0.051 BTC", model: "iPhone 12" },
    { year: 2021, description: "0.018 BTC", model: " iPhone 13" },
    { year: 2022, description: "0.042 BTC", model: "iPhone 14 " },
    {
      year: 2023,
      description: `${price2} BTC`,
      model: "iPhone 15 ",
    },
  ];
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex"></div>

      <div className="relative flex place-items-center before:absolute before:h-[300px] before:w-[480px] before:-translate-x-1/2 before:rounded-full before:bg-gradient-radial before:from-white before:to-transparent before:blur-2xl before:content-[''] after:absolute after:-z-20 after:h-[180px] after:w-[240px] after:translate-x-1/3 after:bg-gradient-conic after:from-sky-200 after:via-blue-200 after:blur-2xl after:content-[''] before:dark:bg-gradient-to-br before:dark:from-transparent before:dark:to-blue-700 before:dark:opacity-10 after:dark:from-sky-900 after:dark:via-[#0141ff] after:dark:opacity-40 before:lg:h-[360px] z-[-1]">
        <div>
          <p className="text-3xl font-serif text-center">BTC2IPhone</p>
          <p className="text-center">(Iphone price follow Bitcoin)</p>
        </div>
      </div>
      <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-4 lg:text-left"></div>
      <div className="flex flex-col items-center justify-center">
        <div className="border-r-2 border-gray-500 h-full"></div>
        <ul className="timeline">
          {events.map((event, index) => (
            <li key={event.year}>
              <div
                key={event.year}
                className={index % 2 ? "direction-r" : "direction-l"}
              >
                <div className="flag-wrapper">
                  <span className="flag text-black">{event.model}</span>
                  <span className="time-wrapper">
                    <span className="time text-xs">{event.year}</span>
                  </span>
                </div>

                <div className="desc">
                  <span className="">{event.description}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
