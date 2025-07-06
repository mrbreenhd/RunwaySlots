
    let currentTurnaroundAirport = "";
    let currentTurnaroundFormat = "";

    function updateSeatMapping() {
    }

    function parseFlightDate(dateStr) {
      let day = parseInt(dateStr.substring(0, 2), 10);
      let monthStr = dateStr.substring(2, 5).toUpperCase();
      let year = parseInt(dateStr.substring(5), 10);
      const monthMap = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
      return new Date(year, monthMap[monthStr], day);
    }

    function formatDate(date) {
      let day = ("0" + date.getDate()).slice(-2);
      let monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      return day + monthNames[date.getMonth()];
    }

    function getDayOfOperation(dateString) {
      const days = { 0: "0000007", 1: "1000000", 2: "0200000", 3: "0003000", 4: "0004000", 5: "0000500", 6: "0000060" };
      let date = parseFlightDate(dateString);
      return days[date.getDay()] || "";
    }

    function getSeatNumberAndAircraftType(aircraftType, serviceType) {
      aircraftType = aircraftType.toUpperCase().trim();
      const seatAndAircraft = {
        "7M8": { "P": "0007M8", "D": "0007M8", "J": "1977M8" },
        "738": { "P": "00073H", "D": "00073H", "J": "18973H" }
      };
      return seatAndAircraft[aircraftType] ? seatAndAircraft[aircraftType][serviceType] || "" : "";
    }

    function generateTurnaround() {
      const input = document.getElementById("flightData").value.trim();
      const arrivalServiceType = document.getElementById("arrivalServiceType").value;
      const departureServiceType = document.getElementById("departureServiceType").value;
      const state = document.getElementById("state").value;
      let prefix = state === "NEW" ? "N" : "D";
      const lines = input.split("\n").filter(line => line.trim() !== "");
      if (lines.length !== 2) {
        document.getElementById("output").innerText = "Please paste exactly two flight data lines.";
        return;
      }
      const arrival = lines[0].split(" ");
      const departure = lines[1].split(" ");
      if (arrival.length < 8 || departure.length < 8) {
        document.getElementById("output").innerText = "Each flight data line must have at least 8 fields.";
        return;
      }
      let arrivalFlightNumber = arrival[0].replace(/P$/, "");
      let arrDepAirport = arrival[1];
      let turnaroundAirport = arrival[2];
      let flightDateFullA = arrival[3].toUpperCase();
      let arrArrivalTime = arrival[5];
      let aircraftTypeA = arrival[7];
      let depDepAirport = departure[1];
      let flightDateFullD = departure[3].toUpperCase();
      let depDepartureTime = departure[4];
      let flightDateDisplayA = flightDateFullA.substring(0, 5);
      let flightDateDisplayD = flightDateFullD.substring(0, 5);
      let dayOfOperation = getDayOfOperation(flightDateFullA);
      let today = new Date();
      let slotDate = formatDate(today);
      let seatAndAircraft = getSeatNumberAndAircraftType(aircraftTypeA, arrivalServiceType);
      let originInfo = arrDepAirport + arrArrivalTime;
      let depInfo = depDepartureTime + depDepAirport;
      let formattedOutput = `${prefix}${arrivalFlightNumber} ${arrivalFlightNumber} ${flightDateDisplayA}${flightDateDisplayD} ${dayOfOperation} ${seatAndAircraft} ${originInfo} ${depInfo} ${arrivalServiceType}${departureServiceType}`;
      let weekLine = "S25";
      let slotRequest = state === "CANCEL" ? `SI SLOT CANX REQ ${turnaroundAirport}` : `SI NEW SLOT REQ ${turnaroundAirport}`;
      let turnaroundFormat = `SCR\n${weekLine}\n${slotDate}\n${turnaroundAirport}\n${formattedOutput}\n\n${slotRequest}\n`;

      currentTurnaroundAirport = turnaroundAirport;
      currentTurnaroundFormat = turnaroundFormat;

      document.getElementById("output").innerText = turnaroundFormat;
    }

    // New function: Email Turnaround using Firebase
    function emailTurnaround() {
      if (!currentTurnaroundAirport || !currentTurnaroundFormat) {
        alert("Please generate the turnaround format first.");
        return;
      }
      // Read the current state from the "state" dropdown.
      const state = document.getElementById("state").value;
      let subject = state === "CANCEL" 
                      ? "SLOT CANX REQ " + currentTurnaroundAirport 
                      : "NEW SLOT REQ " + currentTurnaroundAirport;
      const ccEmail = "slotdesk@ryanair.com";
      // Fetch the email for the turnaround airport from Firebase.
      firebase.database().ref("airports/" + currentTurnaroundAirport).once("value")
        .then(snapshot => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            let emailAddress = data.email || "slotdesk@ryanair.com";
            const mailtoLink = "mailto:" + emailAddress +
              "?cc=" + encodeURIComponent(ccEmail) +
              "&subject=" + encodeURIComponent(subject) +
              "&body=" + encodeURIComponent(currentTurnaroundFormat);
            window.location.href = mailtoLink;
          } else {
            alert("No email data found for airport: " + currentTurnaroundAirport);
          }
        })
        .catch(error => {
          console.error("Error fetching email:", error);
          alert("Error fetching email: " + error.message);
        });
    }
