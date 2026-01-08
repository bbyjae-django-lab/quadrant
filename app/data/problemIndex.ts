export type ProblemIndexItem = {
      id: number;
      raw_phrases: string[];
      normalized_problem: string;
      error_quadrant: string;
      protocol_id: string;
    };

    export const problemIndex: ProblemIndexItem[] = [
  {
    "id": 1,
    "raw_phrases": [
      "“I am struggling to take profits; my trades often go from green to red.”",
      "“Poor entries, early exits.”",
      "“I am finding good stocks from the setups but I am not holding the stock for long enough. If stock falls, selling the stock.”",
      "“When taking trades, I take it keeping the day candle in mind but once the trade is entered I look at 15 min sticks and exit out for loss(panic)”",
      "“Trading without stop loss and tend to sell winners too early. What are your recommendations?”",
      "“Trade management: On the basis that the best stocks should just take off I look to move my stop to breakeven as soon as possible and then quite often am stopped out intraday…”"
    ],
    "normalized_problem": "Interfering with trades after entry.",
    "error_quadrant": "Process",
    "protocol_id": "post-entry-information-restriction"
  },
  {
    "id": 2,
    "raw_phrases": [
      "“Overtrading.”",
      "“when a setup failed, I just keep trying for quite a few times, every single time it looked attractive on intraday chart”",
      "“Trading without stop losses, sizing too much during wrong markets and going back again and again has been my downfall.”",
      "“My equity curve sucks… I start add positions and than the stops send me back to the starting point.”"
    ],
    "normalized_problem": "Re-entering failed ideas repeatedly.",
    "error_quadrant": "Trader",
    "protocol_id": "single-attempt-participation"
  },
  {
    "id": 3,
    "raw_phrases": [
      "“Not confident enough to size it up on a single stock, rather finding myself diversifying many stocks.”",
      "“scared to take big position even when I like the setup”",
      "“I am also having the trouble in sizing. I am not able to take big position and not able to add to the position later.”",
      "“How and when to increase size”"
    ],
    "normalized_problem": "Avoiding commitment through fragmentation.",
    "error_quadrant": "Trader",
    "protocol_id": "risk-and-size-immutability"
  },
  {
    "id": 4,
    "raw_phrases": [
      "“I am getting stopped out quite often. If I increase the SL, then many a times I am having losses…”",
      "“due to time difference can’t able to watch monitor during US hours… often struggling to setup stop loss and take profit level”",
      "“Impact of afterhours movements these days on positions, especially when stop loss level are breached.”"
    ],
    "normalized_problem": "Misplacing risk controls relative to trade structure.",
    "error_quadrant": "Process",
    "protocol_id": "risk-and-size-immutability"
  },
  {
    "id": 5,
    "raw_phrases": [
      "“I get impacted my news and overall sentiment.”",
      "“How do I Eliminate noise and stay anchored to my core edge.”",
      "“How to develop conviction in the setup? Self doubt always creeps in”",
      "“How to know if its a good trade…”"
    ],
    "normalized_problem": "Letting external information override trade qualification.",
    "error_quadrant": "Market / SA",
    "protocol_id": "post-entry-information-restriction"
  },
  {
    "id": 7,
    "raw_phrases": [
      "“Personality and trading style…”",
      "“How to build conviction thats not swayed by news?”",
      "“Hi EG, could you please share in more detail what you saw to convince you NVDA would be a choppyish failed breakdown?”",
      "“Lets say you are 6 month baby trader…”"
    ],
    "normalized_problem": "Searching for certainty instead of executing defined criteria.",
    "error_quadrant": "Setup",
    "protocol_id": "entry-trigger-lock"
  },
  {
    "id": 8,
    "raw_phrases": [
      "“Tendency to price average the trades when going against my direction”",
      "“Trading without stop losses, sizing too much during wrong markets and going back again and again has been my downfall.”",
      "“how to avoid dilemma between swing and day trade… also when ever i entered 2x etfs they pull me down a lot due to the fact, i did not keep a stop loss”"
    ],
    "normalized_problem": "Adding risk to losing positions.",
    "error_quadrant": "Trader",
    "protocol_id": "risk-and-size-immutability"
  },
  {
    "id": 9,
    "raw_phrases": [
      "“Not being able to set up profit targets correctly.”",
      "“Please talk about trade management on 2nd and 3rd days”",
      "“I find around 5 good anticipation setups pre-market… how long do I hold the position before moving into something else if it hasn't broken out yet”"
    ],
    "normalized_problem": "Holding trades without predefined exit resolution.",
    "error_quadrant": "Process",
    "protocol_id": "exit-rule-immutability"
  },
  {
    "id": 10,
    "raw_phrases": [
      "“I used to trade market open… but now I can only trade the last hour.”",
      "“My trading problem is that I can only trade in the morning…”",
      "“Screentime. I can spend about half hour to 1hr in morning… either i'm too late to the party or staying too long”"
    ],
    "normalized_problem": "Trading outside available monitoring windows.",
    "error_quadrant": "Process",
    "protocol_id": "session-boundary-restriction"
  },
  {
    "id": 12,
    "raw_phrases": [
      "“Good with my setup selection… But I'm unable to do big size trades.”",
      "“Problem: Optimizing size… But don't have guts!!!”",
      "“My Problem : I have inherent fear of scaling up.”"
    ],
    "normalized_problem": "Avoiding size escalation despite qualified conditions.",
    "error_quadrant": "Trader",
    "protocol_id": "risk-and-size-immutability"
  },
  {
    "id": 14,
    "raw_phrases": [
      "“Following the principle of ‘Gain expertise on one setup first’…”",
      "“how to avoid dilemma between swing and day trade, and ends up doing both”"
    ],
    "normalized_problem": "Switching execution modes mid-cycle.",
    "error_quadrant": "Process",
    "protocol_id": "exit-rule-immutability"
  },
  {
    "id": 16,
    "raw_phrases": [
      "“I have a problem trading in the first 30 minutes after opening.”",
      "“Got this weird habit of peeping intraday chart.”"
    ],
    "normalized_problem": "Compulsively monitoring noise during execution.",
    "error_quadrant": "Trader",
    "protocol_id": "post-entry-information-restriction"
  },
  {
    "id": 17,
    "raw_phrases": [
      "“How do I not trade after exiting the trade with profit?”",
      "“Feels like i get good trades but not enough to over come the losers.”"
    ],
    "normalized_problem": "Recycling capital immediately after exits.",
    "error_quadrant": "Trader",
    "protocol_id": "single-attempt-participation"
  },
  {
    "id": 18,
    "raw_phrases": [
      "“with the market extended condition i am always hesitant to enter a single trade.”",
      "“Doing SA every morning has significantly improved… The main issue seems to be managing the additional trades”"
    ],
    "normalized_problem": "Overfilling trade slots after initial success.",
    "error_quadrant": "Process",
    "protocol_id": "single-attempt-participation"
  },
  {
    "id": 20,
    "raw_phrases": [
      "“The more I trade it's the average from series of dynamic result…”",
      "“What should I do?”"
    ],
    "normalized_problem": "Anchoring outcomes to single-trade expectations.",
    "error_quadrant": "Trader",
    "protocol_id": "emotional-state-trading-ban"
  },
  {
    "id": 21,
    "raw_phrases": [
      "“My problem is prioritization…”",
      "“deciding what setup to focus on. I look at too many things”",
      "“I am struggling with the setup selection and jumping from one to another.”",
      "“Swing trading FHP - I struggle to prioritize which breakout to take”"
    ],
    "normalized_problem": "Failing to rank opportunities before execution.",
    "error_quadrant": "Process",
    "protocol_id": "trade-count-and-exposure-cap"
  },
  {
    "id": 22,
    "raw_phrases": [
      "“A lot of people mention that they use price alerts…”",
      "“I struggle to spot a true, genuine, A+ setup.”",
      "“I can't tell when to enter - I inevitably get stuck between feeling like I'm too early… or late”"
    ],
    "normalized_problem": "Triggering entries without a binary signal.",
    "error_quadrant": "Setup",
    "protocol_id": "entry-trigger-lock"
  },
  {
    "id": 23,
    "raw_phrases": [
      "“Looking to improving my winrate with taking smaller profits of 1-3%…”",
      "“How should I set my sell rules?”",
      "“My problem is selling. I don't know when to sell”",
      "“For swing trades, exiting position from new entries for small loss…”"
    ],
    "normalized_problem": "Exiting trades without a fixed liquidation rule.",
    "error_quadrant": "Process",
    "protocol_id": "exit-rule-immutability"
  },
  {
    "id": 24,
    "raw_phrases": [
      "“My problem has been the balancing act between… entering early vs waiting for confirmation”",
      "“I struggle to prioritize which breakout to take and whether FEE or not to FEE.”"
    ],
    "normalized_problem": "Hesitating between mutually exclusive entry modes.",
    "error_quadrant": "Setup",
    "protocol_id": "entry-trigger-lock"
  },
  {
    "id": 25,
    "raw_phrases": [
      "“Learning to turn off regret when my stock selection is wrong.”",
      "“How do you overcome the fear of previous trading losses and get out of state of inaction.”",
      "“For a new Trader, how to overcome the fear of losing capital or losing a trade?”"
    ],
    "normalized_problem": "Allowing prior outcomes to block new execution.",
    "error_quadrant": "Trader",
    "protocol_id": "emotional-state-trading-ban"
  },
  {
    "id": 26,
    "raw_phrases": [
      "“Trying to manage 7 accounts at same time.”",
      "“I need a process for record keeping and risk management…”"
    ],
    "normalized_problem": "Exceeding operational capacity.",
    "error_quadrant": "Process",
    "protocol_id": "trade-count-and-exposure-cap"
  },
  {
    "id": 27,
    "raw_phrases": [
      "“my main problem… i have very bad habits make increase my stop loss”",
      "“My trading problem is risk management, entering with a big size and not following stops with discipline.”",
      "“how do select sensible stop loss ?”"
    ],
    "normalized_problem": "Expanding downside after entry.",
    "error_quadrant": "Trader",
    "protocol_id": "risk-and-size-immutability"
  },
  {
    "id": 28,
    "raw_phrases": [
      "“Oversizing - I don't size well my risk…”",
      "“Sizing, I've reached a point where my 1% risk is too big for me”"
    ],
    "normalized_problem": "Taking position sizes that impair execution.",
    "error_quadrant": "Trader",
    "protocol_id": "risk-and-size-immutability"
  },
  {
    "id": 29,
    "raw_phrases": [
      "“Over Trading that turns Small red -> Big red.”",
      "“Situational Awareness - When do I dial down size and trade frequency?”",
      "“Trouble having a mind clarity on what to do during overall market being extended / choppy”"
    ],
    "normalized_problem": "Continuing to trade during degraded conditions.",
    "error_quadrant": "Market / SA",
    "protocol_id": "regime-participation-filter"
  },
  {
    "id": 31,
    "raw_phrases": [
      "“Attempt to peel results choking the trade in hindsight. Wrecking R:R.”",
      "“I sell winner too soon”",
      "“Not selling into strength”",
      "“I am able to find the right breakouts but not able to convert the right exit strategy”"
    ],
    "normalized_problem": "Interfering with exits based on hindsight.",
    "error_quadrant": "Process",
    "protocol_id": "exit-rule-immutability"
  },
  {
    "id": 32,
    "raw_phrases": [
      "“Struggling Between Early Entry which fades and Late Entry Chasing”",
      "“Fixing my entries. Always entering a % or $1 or 2 later than what I want”",
      "“I am not able to time the individual buy point properly”"
    ],
    "normalized_problem": "Missing predefined entry levels and compensating late.",
    "error_quadrant": "Setup",
    "protocol_id": "entry-trigger-lock"
  },
  {
    "id": 33,
    "raw_phrases": [
      "“My trading problem is SA. Knowing when FEE is working and not”",
      "“Similar issue with some above - Still not good with SA, not knowing when to FEE.”",
      "“My problem is SA.”"
    ],
    "normalized_problem": "Executing without resolved regime context.",
    "error_quadrant": "Market / SA",
    "protocol_id": "regime-participation-filter"
  },
  {
    "id": 34,
    "raw_phrases": [
      "“Getting chopped out with low of day stops on breakout setups frequently”",
      "“I either get stopped out at low of day or move my stop to breakeven too soon”"
    ],
    "normalized_problem": "Using structural stops that invalidate the setup.",
    "error_quadrant": "Setup",
    "protocol_id": "risk-and-size-immutability"
  },
  {
    "id": 35,
    "raw_phrases": [
      "“I trade small & micro-cap momentum stocks. Nearly got caught in halts twice”",
      "“I’ve seen strong trends collapse in one day several times recently”"
    ],
    "normalized_problem": "Accepting asymmetric risk without filters.",
    "error_quadrant": "Market / SA",
    "protocol_id": "regime-participation-filter"
  },
  {
    "id": 37,
    "raw_phrases": [
      "“I have multiple accounts (different sizes…)”",
      "“Trying to manage 7 accounts at same time.”"
    ],
    "normalized_problem": "Fragmenting attention across accounts.",
    "error_quadrant": "Process",
    "protocol_id": "trade-count-and-exposure-cap"
  },
  {
    "id": 38,
    "raw_phrases": [
      "“My main problem this year is with the style drift”",
      "“Finding and learning one setup. I tend to jump around”",
      "“Always jumping from one approach to another.”"
    ],
    "normalized_problem": "Abandoning a method before outcomes resolve.",
    "error_quadrant": "Trader",
    "protocol_id": "strategy-singularity-constraint"
  },
  {
    "id": 39,
    "raw_phrases": [
      "“Don't know what setup to learn that works under current market conditions.”",
      "“Been a long term position investor. Trying to switch to swing trading”",
      "“I only swing trade mom bursts… Most of my trades failed in the past 7 months.”"
    ],
    "normalized_problem": "Changing strategy in response to recent losses.",
    "error_quadrant": "Trader",
    "protocol_id": "strategy-singularity-constraint"
  },
  {
    "id": 40,
    "raw_phrases": [
      "“There are too many stocks popping up in the first few minutes.”",
      "“overtrading and narrowing my focus”",
      "“overcoming FOMO”"
    ],
    "normalized_problem": "Reacting to abundance instead of filtering.",
    "error_quadrant": "Trader",
    "protocol_id": "trade-count-and-exposure-cap"
  },
  {
    "id": 41,
    "raw_phrases": [
      "“Ability to hold on to winning trades and letting the setup take care of it rather than choking it out”",
      "“Let winners run”",
      "“Emotional exits and inability to hold winners”"
    ],
    "normalized_problem": "Aborting profitable trades prematurely.",
    "error_quadrant": "Trader",
    "protocol_id": "exit-rule-immutability"
  },
  {
    "id": 42,
    "raw_phrases": [
      "“Experimenting with multiple setups and constantly tinkering with new things rather than refining one over and over again.”",
      "“Trying different random trades from different setup than focusing on one setup”",
      "“Always jumping from one approach to another.”"
    ],
    "normalized_problem": "Diluting edge through constant method switching.",
    "error_quadrant": "Process",
    "protocol_id": "strategy-singularity-constraint"
  },
  {
    "id": 43,
    "raw_phrases": [
      "“Back to buying pull back, knowing fully well that I need to do buy A class set up with B/O”",
      "“Stop chasing and switching stocks to find a better SHINY OBJECT”",
      "“Gambling mindset and chasing”"
    ],
    "normalized_problem": "Violating setup eligibility in pursuit of movement.",
    "error_quadrant": "Trader",
    "protocol_id": "strategy-singularity-constraint"
  },
  {
    "id": 44,
    "raw_phrases": [
      "“Trader Problem - Lifestyle and health…”",
      "“random itchy finger trades and those need to stop.”",
      "“Simplify my trading to avoid making known mistakes”"
    ],
    "normalized_problem": "Executing while cognitively degraded.",
    "error_quadrant": "Trader",
    "protocol_id": "emotional-state-trading-ban"
  },
  {
    "id": 46,
    "raw_phrases": [
      "“Chasing Trades.”",
      "“Allowing noise to influence my decision making”",
      "“Stop reading X after Market Open”"
    ],
    "normalized_problem": "Letting external stimuli drive entries.",
    "error_quadrant": "Trader",
    "protocol_id": "strategy-singularity-constraint"
  },
  {
    "id": 47,
    "raw_phrases": [
      "“Overtrading.”",
      "“fixing over trading”",
      "“too many stocks to manage”"
    ],
    "normalized_problem": "Excessive trade frequency beyond control capacity.",
    "error_quadrant": "Process",
    "protocol_id": "trade-count-and-exposure-cap"
  },
  {
    "id": 48,
    "raw_phrases": [
      "“Lack of Market Awareness.”",
      "“not following situational awareness”",
      "“Trying to trade with same approach and thus overlooking SA”"
    ],
    "normalized_problem": "Ignoring market regime during execution.",
    "error_quadrant": "Market / SA",
    "protocol_id": "regime-participation-filter"
  },
  {
    "id": 49,
    "raw_phrases": [
      "“lazy to put stop losses”",
      "“Stop doing emotional entry and exist”",
      "“Poor position sizing”"
    ],
    "normalized_problem": "Entering trades without enforced risk definition.",
    "error_quadrant": "Process",
    "protocol_id": "risk-and-size-immutability"
  },
  {
    "id": 50,
    "raw_phrases": [
      "“belief in myself”",
      "“Lack of confidence and self-belief”"
    ],
    "normalized_problem": "Hesitating or interfering due to self-doubt.",
    "error_quadrant": "Trader",
    "protocol_id": "emotional-state-trading-ban"
  },
  {
    "id": 51,
    "raw_phrases": [
      "“Exiting too early or late”",
      "“my trading problem is trade management… I am scared and closed the position even my stop is not getting hit”",
      "“Alot of time I get a good entry but the gains get quickly eaten up.”",
      "“How do you decide when to exit a losing momentum burst trade early before the initial stop?”"
    ],
    "normalized_problem": "Manually overriding exits based on P&L movement.",
    "error_quadrant": "Trader",
    "protocol_id": "exit-rule-immutability"
  },
  {
    "id": 52,
    "raw_phrases": [
      "“Ignoring stop losses or risk parameters”",
      "“Follow stop loss strategy on every order from now.”",
      "“My biggest losses this year have come from two gap downs… overnight positions were without stop losses.”"
    ],
    "normalized_problem": "Allowing unbounded downside exposure.",
    "error_quadrant": "Process",
    "protocol_id": "risk-and-size-immutability"
  },
  {
    "id": 53,
    "raw_phrases": [
      "“Unstructured routines”",
      "“Poor health affecting focus”",
      "“Trading conflicting setups with lifestyle”"
    ],
    "normalized_problem": "Trading without operational readiness.",
    "error_quadrant": "Trader",
    "protocol_id": "emotional-state-trading-ban"
  },
  {
    "id": 54,
    "raw_phrases": [
      "“STOP COUNTER TREND TRADING!”",
      "“Trying to trade with same approach and thus overlooking SA”",
      "“Reducing exposure in unfavorable swing conditions”"
    ],
    "normalized_problem": "Trading against prevailing market direction.",
    "error_quadrant": "Market / SA",
    "protocol_id": "regime-participation-filter"
  },
  {
    "id": 55,
    "raw_phrases": [
      "“I am overtrading and mixing all the setups”",
      "“Over trading”",
      "“overtrading and narrowing my focus”"
    ],
    "normalized_problem": "Excessive trade frequency across multiple setups.",
    "error_quadrant": "Process",
    "protocol_id": "trade-count-and-exposure-cap"
  },
  {
    "id": 57,
    "raw_phrases": [
      "“Not adapting quickly enough to a change in narrative.”",
      "“Make 40% gains but then give 10% back through not being nimble enough in thought.”"
    ],
    "normalized_problem": "Holding positions after edge decay.",
    "error_quadrant": "Market / SA",
    "protocol_id": "regime-participation-filter"
  },
  {
    "id": 58,
    "raw_phrases": [
      "“I felt so confident… Arrogance led to bad decisions, and that was followed by revenge trading.”",
      "“Hi EG, i have a problem with trade, sometime have some issue with the revange trade...”"
    ],
    "normalized_problem": "Escalating risk after emotional activation.",
    "error_quadrant": "Trader",
    "protocol_id": "emotional-state-trading-ban"
  },
  {
    "id": 61,
    "raw_phrases": [
      "“I'm working on holding winners longer, but now I'm holding them too long and losing a lot of paper gains”",
      "“Choking off trades too early , winners or losers.”",
      "“Sometimes not letting the trade play off, especially when day trading.”",
      "“Moving Up Stop loss to early - killing trades with good profit potential”"
    ],
    "normalized_problem": "Oscillating between premature exit and overholding.",
    "error_quadrant": "Trader",
    "protocol_id": "exit-rule-immutability"
  },
  {
    "id": 62,
    "raw_phrases": [
      "“My trading problem - Entry. I put limit order at bid price… then I change the limit again”",
      "“Entry on Gap ups. Often getting chopped.”",
      "“Fixing my entries. Always entering a % or $1 or 2 later than what I want”"
    ],
    "normalized_problem": "Chasing price after missing the planned entry.",
    "error_quadrant": "Setup",
    "protocol_id": "single-attempt-participation"
  },
  {
    "id": 63,
    "raw_phrases": [
      "“Stop loss is another problem. Not able to figure out the correct stop loss.”",
      "“Adapting Stop Loss to different Market Environment.”",
      "“Stop loss… I have been stopped out with that predefined loss.”"
    ],
    "normalized_problem": "Constantly reworking stop logic after outcomes.",
    "error_quadrant": "Process",
    "protocol_id": "risk-and-size-immutability"
  },
  {
    "id": 64,
    "raw_phrases": [
      "“Chasing golden goose.”",
      "“Chasing too many stocks is diluting my focus”",
      "“Overtrading”"
    ],
    "normalized_problem": "Pursuing multiple opportunities simultaneously.",
    "error_quadrant": "Trader",
    "protocol_id": "trade-count-and-exposure-cap"
  },
  {
    "id": 65,
    "raw_phrases": [
      "“Not able to position size more than 10% with confidence”",
      "“my main issue nowadays is that the uncertainty of the trade makes me afraid to scale up”",
      "“Not concentrating with size enough and thus having ~15-20 positions”"
    ],
    "normalized_problem": "Avoiding meaningful exposure through over-diversification.",
    "error_quadrant": "Trader",
    "protocol_id": "risk-and-size-immutability"
  },
  {
    "id": 70,
    "raw_phrases": [
      "“Too many positions with too small sums.”",
      "“Overtrading”"
    ],
    "normalized_problem": "Fragmenting capital across excessive trades.",
    "error_quadrant": "Process",
    "protocol_id": "trade-count-and-exposure-cap"
  },
  {
    "id": 72,
    "raw_phrases": [
      "“Jump from setup to setup. I know it is bad, but can't find a setup that I can trust and optimize.”",
      "“keep changing strategy and greedy with options.”",
      "“Unable to drop old habits and mixing them with stockbee methods.”"
    ],
    "normalized_problem": "Abandoning systems before statistical resolution.",
    "error_quadrant": "Trader",
    "protocol_id": "strategy-singularity-constraint"
  },
  {
    "id": 73,
    "raw_phrases": [
      "“Revenge trading”",
      "“FOMO (Need to develop patience) !!”",
      "“fear of failure, fear of losing money”"
    ],
    "normalized_problem": "Reacting emotionally to prior outcomes.",
    "error_quadrant": "Trader",
    "protocol_id": "emotional-state-trading-ban"
  },
  {
    "id": 74,
    "raw_phrases": [
      "“Not sticking to my main idea ‘buy clean swings on the first day of the b/o’”",
      "“turning to day trading vs swing trading and not giving room for the move (3%)”"
    ],
    "normalized_problem": "Deviating from the declared trade thesis mid-execution.",
    "error_quadrant": "Process",
    "protocol_id": "strategy-singularity-constraint"
  },
  {
    "id": 75,
    "raw_phrases": [
      "“Choked out easily, dead by thousand cut.”",
      "“Many good entry but lost on fades.”",
      "“I am scared to loose the first day of the swing.”"
    ],
    "normalized_problem": "Over-engaging during fragile early moves.",
    "error_quadrant": "Trader",
    "protocol_id": "emotional-state-trading-ban"
  },
  {
    "id": 77,
    "raw_phrases": [
      "“Overtrading, setup clarity, taking trades/setups without having developed procedural memory”",
      "“No mind clarity about the set up. What is really important?”"
    ],
    "normalized_problem": "Executing without internalized setup criteria.",
    "error_quadrant": "Setup",
    "protocol_id": "strategy-singularity-constraint"
  },
  {
    "id": 79,
    "raw_phrases": [
      "“Holding on to losing positions hoping they'll come back up.”",
      "“Getting married to a stock that is looser.”",
      "“Holding Losers. Giving back big $.”"
    ],
    "normalized_problem": "Refusing to exit invalidated trades.",
    "error_quadrant": "Trader",
    "protocol_id": "emotional-state-trading-ban"
  },
  {
    "id": 80,
    "raw_phrases": [
      "“getting overwhelmed with scan results sometimes which lead to hesitation”",
      "“Not being confident enough about my selected list of stocks.”"
    ],
    "normalized_problem": "Freezing under excess choice.",
    "error_quadrant": "Process",
    "protocol_id": "trade-count-and-exposure-cap"
  },
  {
    "id": 81,
    "raw_phrases": [
      "“Avoid looking at the 1 and 5 minute charts, it just messes with my head.”",
      "“When trading on daily time frame, the fear that the trade is going to reverse on you and stop you out for a loss.”",
      "“Stops once in the trade, right time to sell into strength versus give it room”"
    ],
    "normalized_problem": "Micromanaging trades through lower timeframe monitoring.",
    "error_quadrant": "Trader",
    "protocol_id": "post-entry-information-restriction"
  },
  {
    "id": 82,
    "raw_phrases": [
      "“Giving up on a trade if I miss the first move.”",
      "“Entry: Passing on a good setup thinking the price is extended, but the ticker moves higher, and FOMO kicks in.”"
    ],
    "normalized_problem": "Abandoning valid setups after imperfect entries.",
    "error_quadrant": "Trader",
    "protocol_id": "single-attempt-participation"
  },
  {
    "id": 83,
    "raw_phrases": [
      "“Trade management is my biggest problem… gave it all up and some after Mr Powell started to talk after FOMC.”",
      "“Unable to handle intra day swings”",
      "“Trade management after entry”"
    ],
    "normalized_problem": "Failing to contain exposure during volatility events.",
    "error_quadrant": "Market / SA",
    "protocol_id": "emotional-state-trading-ban"
  },
  {
    "id": 84,
    "raw_phrases": [
      "“Picking up the RIGHT stop loss. Always stopped out.”",
      "“Exit: Not respecting stop loss (getting panicked out of good positions on small reversals).”"
    ],
    "normalized_problem": "Inconsistent adherence to stop logic.",
    "error_quadrant": "Process",
    "protocol_id": "risk-and-size-immutability"
  },
  {
    "id": 85,
    "raw_phrases": [
      "“When MM breadth is deteriorating… have missed many moves.”",
      "“Not agile enough to changing market conditions.”"
    ],
    "normalized_problem": "Freezing execution due to conflicting context signals.",
    "error_quadrant": "Market / SA",
    "protocol_id": "entry-trigger-lock"
  },
  {
    "id": 87,
    "raw_phrases": [
      "“Still cutting my winners too short because I choke the trade by moving stops up.”",
      "“profits build up slowly, but get lost very quickly.”",
      "“How to not give back profits after few successful wins?”"
    ],
    "normalized_problem": "Compressing upside while leaving downside intact.",
    "error_quadrant": "Trader",
    "protocol_id": "exit-rule-immutability"
  },
  {
    "id": 88,
    "raw_phrases": [
      "“boom & bust, build up the account and then in a couple of days lose all of the gains.”",
      "“overtrade, too many positions, get sloppy with trade management.”"
    ],
    "normalized_problem": "Expanding activity after short-term success.",
    "error_quadrant": "Trader",
    "protocol_id": "emotional-state-trading-ban"
  },
  {
    "id": 89,
    "raw_phrases": [
      "“Not picky enough when shortlisting stocks.”",
      "“Watchlist is way too long compared to EG's.”",
      "“I have a problem juggling between different scans”"
    ],
    "normalized_problem": "Overloading attention during selection.",
    "error_quadrant": "Process",
    "protocol_id": "trade-count-and-exposure-cap"
  },
  {
    "id": 92,
    "raw_phrases": [
      "“I enter a valid BO with low of day stop… move the stop up to breakeven… get stopped out”",
      "“Moving stop loss aggressively and not giving enough room”",
      "“Still cutting my winners too short because I choke the trade by moving stops up.”"
    ],
    "normalized_problem": "Compressing trades by tightening stops prematurely.",
    "error_quadrant": "Trader",
    "protocol_id": "risk-and-size-immutability"
  },
  {
    "id": 93,
    "raw_phrases": [
      "“Impulsive Scalps”",
      "“Over-Trading”",
      "“Bought gap ups premarket (dreaming it'll go up 300%) & sold at loss.”"
    ],
    "normalized_problem": "Acting on impulse instead of plan.",
    "error_quadrant": "Trader",
    "protocol_id": "emotional-state-trading-ban"
  },
  {
    "id": 96,
    "raw_phrases": [
      "“my style is all over the place and has very little consistency”",
      "“sit at the computer at market open without a game plan.”"
    ],
    "normalized_problem": "Entering sessions without a defined execution plan.",
    "error_quadrant": "Process",
    "protocol_id": "emotional-state-trading-ban"
  },
  {
    "id": 97,
    "raw_phrases": [
      "“SA - both anticipate the change (jump the gun) and react late”",
      "“Not being reactive to the new trend in the markets.”",
      "“Not being analytical to the market environment.”"
    ],
    "normalized_problem": "Mis-timing regime recognition.",
    "error_quadrant": "Market / SA",
    "protocol_id": "entry-trigger-lock"
  },
  {
    "id": 98,
    "raw_phrases": [
      "“I follow my SA, but get FOMO when stocks move in the direction of my SA.”",
      "“Entry: Passing on a good setup thinking the price is extended”"
    ],
    "normalized_problem": "Letting missed participation trigger reactive entries.",
    "error_quadrant": "Trader",
    "protocol_id": "single-attempt-participation"
  },
  {
    "id": 99,
    "raw_phrases": [
      "“Process / Trade Factory… I drift and start doing random shit.”",
      "“not following rules / SA. how to stick to your plan?!”"
    ],
    "normalized_problem": "Breaking process under cognitive load.",
    "error_quadrant": "Process",
    "protocol_id": "emotional-state-trading-ban"
  },
  {
    "id": 100,
    "raw_phrases": [
      "“Very smart personalities have a very hard time in trading.”",
      "“Analyzis Paralyzis”"
    ],
    "normalized_problem": "Over-analysis blocking execution.",
    "error_quadrant": "Trader",
    "protocol_id": "trade-count-and-exposure-cap"
  },
  {
    "id": 101,
    "raw_phrases": [
      "“Find it difficult to get back into the trading after a week off or more due to travel.”",
      "“Feels like I have lost touch with the market when returning and takes a few weeks to really get back into it.”"
    ],
    "normalized_problem": "Resuming full trading without re-synchronizing to market context.",
    "error_quadrant": "Market / SA",
    "protocol_id": "regime-participation-filter"
  },
  {
    "id": 102,
    "raw_phrases": [
      "“Trying to trade setups for which I haven't got a playbook for.”",
      "“Not sticking to one setup and mastering it.”",
      "“Experimenting too much and perfecting too little.”"
    ],
    "normalized_problem": "Executing without a defined playbook.",
    "error_quadrant": "Setup",
    "protocol_id": "strategy-singularity-constraint"
  },
  {
    "id": 105,
    "raw_phrases": [
      "“I sell too early to protect profits.”",
      "“Taking profits too soon, e.g. after 1-2 hours at only 1-5% for fear of giving all back.”",
      "“Entering big… then see them as quick money and get as out quickly.”"
    ],
    "normalized_problem": "Premature profit capture driven by fear.",
    "error_quadrant": "Trader",
    "protocol_id": "exit-rule-immutability"
  },
  {
    "id": 106,
    "raw_phrases": [
      "“I am a tinkerer.”",
      "“My focus during deep dives is limited.”",
      "“Experimenting too much and perfecting too little.”"
    ],
    "normalized_problem": "Diverting execution time into unbounded optimization.",
    "error_quadrant": "Process",
    "protocol_id": "strategy-singularity-constraint"
  },
  {
    "id": 107,
    "raw_phrases": [
      "“By nature, I am often more skeptical than optimistic.”",
      "“Not trusting the setup.”",
      "“Getting rid of old habits and trusting the new process.”"
    ],
    "normalized_problem": "Undermining execution through persistent doubt.",
    "error_quadrant": "Trader",
    "protocol_id": "entry-trigger-lock"
  },
  {
    "id": 109,
    "raw_phrases": [
      "“My stops are too tight and do not allow for the ‘natural reaction’ for swing and position trades.”",
      "“i choke trades out by having too close a stop or moving them up to soon.”"
    ],
    "normalized_problem": "Using stops that invalidate the trade thesis.",
    "error_quadrant": "Setup",
    "protocol_id": "risk-and-size-immutability"
  },
  {
    "id": 110,
    "raw_phrases": [
      "“Overtrading - I see a setup and I enter, inability to pass on a trade.”",
      "“Not sticking to one setup and mastering it… lowering standards as a result.”",
      "“I give too much of my gains back by making bad trades or trades that are not part of my plan.”"
    ],
    "normalized_problem": "Executing marginal trades outside plan.",
    "error_quadrant": "Trader",
    "protocol_id": "strategy-singularity-constraint"
  },
  {
    "id": 111,
    "raw_phrases": [
      "“My problem is that sometimes I put on more risk, just because I've had a string of winning trades.”"
    ],
    "normalized_problem": "Increasing risk after recent success.",
    "error_quadrant": "Trader",
    "protocol_id": "emotional-state-trading-ban"
  },
  {
    "id": 112,
    "raw_phrases": [
      "“adjusting SA on the fly (when is it merited)”",
      "“Not agile enough to changing market conditions.”"
    ],
    "normalized_problem": "Inconsistent context updating during the session.",
    "error_quadrant": "Market / SA",
    "protocol_id": "regime-participation-filter"
  },
  {
    "id": 113,
    "raw_phrases": [
      "“Choking the 'swing' way too soon.”",
      "“I sell too early to protect profits.”"
    ],
    "normalized_problem": "Collapsing swing trades into scalps.",
    "error_quadrant": "Trader",
    "protocol_id": "exit-rule-immutability"
  },
  {
    "id": 114,
    "raw_phrases": [
      "“Not able to get enough conviction for that initial entry.”",
      "“My problem is hesitation when I see a good setup.”",
      "“Pulling the trigger ie self doubt.”"
    ],
    "normalized_problem": "Hesitating at the point of execution.",
    "error_quadrant": "Trader",
    "protocol_id": "entry-trigger-lock"
  },
  {
    "id": 115,
    "raw_phrases": [
      "“losing focus and need to remind myself to trade the setups.”",
      "“need to get out of trade if I see clear breakdowns.”"
    ],
    "normalized_problem": "Delayed response to invalidation signals.",
    "error_quadrant": "Process",
    "protocol_id": "exit-rule-immutability"
  },
  {
    "id": 116,
    "raw_phrases": [
      "“picking the right set-ups in choppy market - Currently - profitable”",
      "“Having trouble making money in a choppy market.”"
    ],
    "normalized_problem": "Continuing normal execution during low-quality regimes.",
    "error_quadrant": "Market / SA",
    "protocol_id": "regime-participation-filter"
  },
  {
    "id": 117,
    "raw_phrases": [
      "“Not focusing on one setup to build my mastery.”",
      "“Keep jumping to different setups in hope of profit but bleed more badly.”",
      "“trying to do to much - trading to many patterns”"
    ],
    "normalized_problem": "Diluting edge through setup hopping.",
    "error_quadrant": "Process",
    "protocol_id": "strategy-singularity-constraint"
  },
  {
    "id": 118,
    "raw_phrases": [
      "“I have problems exiting a trade.”",
      "“Take profit too quickly at the first sign of reversal which is not a reversal”",
      "“I have a hard time accepting smaller $$ at times”"
    ],
    "normalized_problem": "Mismanaging exits due to outcome fixation.",
    "error_quadrant": "Trader",
    "protocol_id": "exit-rule-immutability"
  },
  {
    "id": 119,
    "raw_phrases": [
      "“Opening Too many positions (Option trades ) when I am winning”",
      "“Overtrading... taking too much risk.”",
      "“Opening Too many positions… resulting in a Stagnant Equity Growth.”"
    ],
    "normalized_problem": "Expanding exposure after short-term success.",
    "error_quadrant": "Trader",
    "protocol_id": "emotional-state-trading-ban"
  },
  {
    "id": 120,
    "raw_phrases": [
      "“I sometimes don't follow my highest conviction trades.”",
      "“I sometimes am too much of a wuss to take the trade”",
      "“Execution...Execution..and fear of losing..”"
    ],
    "normalized_problem": "Hesitating at execution despite qualification.",
    "error_quadrant": "Trader",
    "protocol_id": "entry-trigger-lock"
  },
  {
    "id": 121,
    "raw_phrases": [
      "“Not being able to find successful trades after the first half hour.”",
      "“My early trades work but my late ones always seem to fade.”"
    ],
    "normalized_problem": "Forcing trades outside optimal session windows.",
    "error_quadrant": "Market / SA",
    "protocol_id": "session-boundary-restriction"
  },
  {
    "id": 123,
    "raw_phrases": [
      "“Getting shaken out and conviction taking bigger size”",
      "“Sizing up without getting an adrenaline rush”"
    ],
    "normalized_problem": "Emotional interference triggered by size.",
    "error_quadrant": "Trader",
    "protocol_id": "risk-and-size-immutability"
  },
  {
    "id": 124,
    "raw_phrases": [
      "“I always look for validation on 5min chart before buying breakouts.”",
      "“I miss a lot of good set ups due to hesitation.”"
    ],
    "normalized_problem": "Seeking extra confirmation beyond the setup.",
    "error_quadrant": "Setup",
    "protocol_id": "entry-trigger-lock"
  },
  {
    "id": 127,
    "raw_phrases": [
      "“Stop-loss management. Either giving too much room…”",
      "“Moving stop too quickly”"
    ],
    "normalized_problem": "Inconsistent stop execution.",
    "error_quadrant": "Process",
    "protocol_id": "risk-and-size-immutability"
  },
  {
    "id": 128,
    "raw_phrases": [
      "“I get fomo after I exit a position and see the move go even higher”"
    ],
    "normalized_problem": "Re-engaging after exit due to regret.",
    "error_quadrant": "Trader",
    "protocol_id": "single-attempt-participation"
  },
  {
    "id": 129,
    "raw_phrases": [
      "“Overtrading… setting targets too aggressive for current market conditions”"
    ],
    "normalized_problem": "Misaligning expectations with regime quality.",
    "error_quadrant": "Market / SA",
    "protocol_id": "regime-participation-filter"
  },
  {
    "id": 130,
    "raw_phrases": [
      "“First and foremost making an exact daily plan that I execute day in and day out”",
      "“What do I do in each specific hour of the trading day.”",
      "“Which scans are most appropriate for each hour…”"
    ],
    "normalized_problem": "Entering sessions without a fixed operational sequence.",
    "error_quadrant": "Process",
    "protocol_id": "session-boundary-restriction"
  }
];
