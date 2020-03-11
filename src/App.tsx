import React, { useState } from "react";
import "./App.css";

import { open, TimeUtil } from "rosbag";

const App = (props: any) => {
  const [basicInfo, setBasicInfo] = useState<any>(null);
  const [topicList, setTopicList] = useState<string[]>([]);
  const [topicCounter, setTopicCounter] = useState<any>();
  const [progress, setProgress] = useState<number>(0);

  const process = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    const bagInstance = await open(files[0]);

    setBasicInfo({
      startTime: bagInstance.startTime,
      endTime: bagInstance.endTime,
      duration: TimeUtil.compare(bagInstance.endTime, bagInstance.startTime)
    });

    const topics = new Set<string>();
    const counter = {};

    await bagInstance.readMessages({ noParse: true }, res => {
      const { topic, chunkOffset, totalChunks } = res;
      topics.add(topic);
      if (counter[topic]) {
        counter[topic] = counter[topic] + 1;
      } else {
        counter[topic] = 1;
      }

      setProgress(Math.round(((chunkOffset + 1) / totalChunks) * 100));
    });

    setTopicCounter(counter);
    setTopicList(Array.from(topics).sort());
  };

  return (
    <>
      <div className="file">
        CHOOSE BAG:
        <input type="file" accept=".bag" onChange={process}></input>
      </div>
      {basicInfo ? (
        <div className="baginfo">
          <hr></hr>
          <div>
            Start Time:{" "}
            {new Date(basicInfo.startTime.sec * 1000).toLocaleString()}
          </div>
          <div>
            End Time: {new Date(basicInfo.endTime.sec * 1000).toLocaleString()}
          </div>
          <div>Duration: {basicInfo.duration}s</div>
          <hr />
          {progress < 100 ? (
            <div>Processing: {progress} %</div>
          ) : (
            topicList.map(t => (
              <div id={t}>
                {t} {topicCounter[t]}
              </div>
            ))
          )}
        </div>
      ) : null}
    </>
  );
};

export default App;
