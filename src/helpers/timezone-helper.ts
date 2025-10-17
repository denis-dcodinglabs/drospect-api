export function formatTimestamp(timestamp: number): string {
  // Create a new Date object using the timestamp
  const date: Date = new Date(timestamp);

  // Get individual components of the date and time
  const year: number = date.getFullYear();
  const month: number = date.getMonth() + 1; // Months are zero-based, so add 1
  const day: number = date.getDate();
  const hours: number = date.getHours();
  const minutes: number = date.getMinutes();
  const seconds: number = date.getSeconds();
  const milliseconds: number = date.getMilliseconds();

  // Format the date and time as a string
  const formattedDateTime: string = `${year}-${month < 10 ? '0' : ''}${month}-${
    day < 10 ? '0' : ''
  }${day}-${hours < 10 ? '0' : ''}${hours}:${
    minutes < 10 ? '0' : ''
  }${minutes}:${seconds < 10 ? '0' : ''}${seconds}.${milliseconds}`;

  return formattedDateTime;
}
