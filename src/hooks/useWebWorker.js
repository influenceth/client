import { useMemo } from 'react';

import Worker from 'worker-loader!../worker'; // eslint-disable-line

let workerIds = 0;

// TODO: remove debug 
// let taskTotal = 0;
// let taskTally = 0;
// let resetPending = true;

// setInterval(() => {
//   if (!resetPending && taskTally > 0) {
//     console.log(
//       `avg response time (over ${taskTally}): ${Math.round(taskTotal / taskTally)}ms`,
//     );
//   }
// }, 5000);

class WorkerThread {
  constructor() {
    this.id = workerIds++;
    this.paramCache = {};
    this.messageCallback = null;

    this.worker = new Worker();
    this.worker.onmessage = (event) => {
      this.onMessage(event);
    };
  }

  onMessage(event) {
    const callback = this.messageCallback;
    this.messageCallback = null;
    if (callback) callback(event.data);
  }

  postMessage(msg, callback, transfer = []) {
    // if worker has cached cacheable params already, then don't include in params
    // else, if new, then note the new cache key
    if (msg._cacheable) {
      if (this.paramCache[msg._cacheable] === msg[msg._cacheable]?.key) {
        delete msg[msg._cacheable];
      } else {
        this.paramCache[msg._cacheable] = msg[msg._cacheable]?.key;
      }
      delete msg._cacheable;
    }

    msg._id = this.id;
    this.messageCallback = callback;
    this.worker.postMessage(msg, transfer);
  }
}

class WorkerThreadPool {
  constructor(tally) {
    this.workers = [...Array(tally)].map(_ => new WorkerThread());
    this.available = [...this.workers];
    this.busy = {};
    this.workQueue = [];
  }

  // i.e. post to all workers in pool
  broadcast(msg) {
    for(let i = 0; i < this.workers.length; i++) {
      this.workers[i].postMessage(msg);
    }
  }

  getWorkerTally() {
    return this.workers.length;
  }

  isBusy() {
    return this.workQueue.length > 0 || Object.keys(this.busy).length > 0;
  }

  addToQueue(workItem, resolve, transfer) {
    this.workQueue.push([workItem, resolve, transfer]);
    this.processQueue();
  }

  removeFromQueue(filterFunc) {
    this.workQueue = this.workQueue.filter(([workItem]) => filterFunc(workItem));
  }

  processQueue() {
    while (this.available.length > 0 && this.workQueue.length > 0) {
      const w = this.available.pop();
      this.busy[w.id] = w;

      const [workItem, workResolve, transfer] = this.workQueue.shift();

      w.postMessage(
        workItem,
        (v) => {
          delete this.busy[w.id];
          this.available.push(w);
          if (workResolve) workResolve(v);
          this.processQueue();
        },
        transfer || []
      );
    }
  }
}

const totalWorkers = (navigator?.hardwareConcurrency || 4) - 1; // CPUs minus 1
const workerThreadPool = new WorkerThreadPool(totalWorkers);

const useWebWorker = () => {
  return useMemo(() => ({
    broadcast: (message) => workerThreadPool.broadcast(message),
    processInBackground: (message, callback, transfer) => workerThreadPool.addToQueue(message, callback, transfer),
    cancelBackgroundProcesses: (filterFunc) => workerThreadPool.removeFromQueue(filterFunc)
  }), []);
};

export default useWebWorker;
