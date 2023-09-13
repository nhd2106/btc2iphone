export default function Home() {
  const events = [
    { year: 2011, description: "iPhone 4s - 162 BTC" },
    { year: 2012, description: "iPhone 5- 53 BTC" },
    { year: 2013, description: "iPhone 5s - 5 BTC" },
    { year: 2014, description: "iPhone 6 - 1.7 BTC" },
    { year: 2015, description: "iPhone 6s - 2.8 BTC" },
    { year: 2016, description: "iPhone 7 - 1.1 BTC" },
    { year: 2017, description: "iPhone 8 - 0.19 BTC" },
    { year: 2017, description: "iPhone X - 0.14 BTC" },
    { year: 2018, description: "iPhone XS - 0.15 BTC" },
    { year: 2019, description: "iPhone 11 - 0.068 BTC" },
    { year: 2020, description: "iPhone 12 - 0.051 BTC" },
    { year: 2021, description: "iPhone 13 - 0.018 BTC" },
    { year: 2022, description: "iPhone 14 - 0.042 BTC" },
    { year: 2023, description: "iPhone 15 - 0.031 BTC" },
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
        {events.map((event) => (
          <div key={event.year} className="flex flex-col items-center">
            <div className="flex items-center mb-3">
              <div className="bg-slate-50 rounded-full h-2 w-2"></div>
              <div className="ml-4 font-bold">{event.year}</div>
            </div>
            <div className="max-w-xs  shadow-lg p-4 bg-white bg-opacity-30 backdrop-blur-lg rounded-lg drop-shadow-lg">
              <p className="text-white">{event.description}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
