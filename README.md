lr-lowlatency
=============

LineRate script example to lower latency using fan-out ideas from Jeff Dean's Velocity 2014 talk.

Can LineRate’s Node.js Scripting help reduce response time latency for large applications? Recently, a talk at Velocity 2014 
by Jeff Dean gave me some ideas for a quick script to do just that.

The idea is simple; any time a response is not received quickly, just replicate the request to another server. low-latency.js
is a quick and admittedly naive script to do just that.

A more advanced script providing more of Jeff Dean’s ideas is certainly possible. Optimizations such as aborting duplicate
requests and server coordination to cancel batched jobs are possible.

Check out the summary and video of Jeff Dean’s talk for many more details behind Google’s implementation and other ideas for
enhancing this script.

See the example config for getting this setup.
