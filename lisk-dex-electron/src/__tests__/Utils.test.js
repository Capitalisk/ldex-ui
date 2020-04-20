import {groupByKey} from "../Utils";

describe("Utils tests => ", () => {

  it("Reduces an array with group by query", () => {
    
   const actualArray = [{"price": 0.8, "value": 1}, {"price": 0.8, "value": 2}, {"price": 0.85, "value": 1}, {"price": 0.86, "value": 1}, 
   {"price": 0.9, "value": 1},{"price": 0.92, "value": 2}, {"price": 0.92, "value": 4}, {"price": 0.8, "value": 4}]

   const expectedReduction = {
       "0.8": {"price": 0.8, "value":7},
       "0.85": {"price": 0.85, "value":1},
       "0.86": {"price": 0.86, "value":1},
       "0.9": {"price": 0.9, "value":1},
       "0.92": {"price": 0.92, "value":6}
   }

    expect(groupByKey(actualArray, "price", "value")).toEqual(expectedReduction);
  });

});