class PeerService {
    constructor() {
        if (!this.peer) {
            this.peer = new RTCPeerConnection({
                iceServers: [
                    {
                        urls: [
                            "stun:stun.l.google.com:19302",
                            "stun:global.stun.twilio.com:3478",
                        ],
                    },
                ],
            });

            // Create a DataChannel if acting as offerer
            this.channel = this.peer.createDataChannel("latencyChannel");
            this._setupChannel(this.channel);

            // Handle remote DataChannel if acting as answerer
            this.peer.ondatachannel = (event) => {
                this.channel = event.channel;
                this._setupChannel(this.channel);
            };
        }
    }

    _setupChannel(channel) {
        channel.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "ping") {
                channel.send(JSON.stringify({ type: "pong", time: data.time }));
            } else if (data.type === "pong") {
                const latency = performance.now() - data.time;
                console.log("⚡ WebRTC Latency:", latency.toFixed(2), "ms");
            }
        };

        channel.onopen = () => {
            console.log("✅ DataChannel open");

            // Start pinging every 2 seconds
            this.pingInterval = setInterval(() => {
                if (channel.readyState === "open") {
                    channel.send(JSON.stringify({ type: "ping", time: performance.now() }));
                }
            }, 2000);
        };

        channel.onclose = () => {
            console.log("❌ DataChannel closed");
            clearInterval(this.pingInterval);
        };
    }

    async getAnswer(offer) {
        if (this.peer) {
            await this.peer.setRemoteDescription(offer);
            const ans = await this.peer.createAnswer();
            await this.peer.setLocalDescription(new RTCSessionDescription(ans));
            return ans;
        }
    }

    async setLocalDescription(ans) {
        if (this.peer) {
            await this.peer.setRemoteDescription(new RTCSessionDescription(ans));
        }
    }

    async getOffer() {
        if (this.peer) {
            const offer = await this.peer.createOffer();
            await this.peer.setLocalDescription(new RTCSessionDescription(offer));
            return offer;
        }
    }
}

export default new PeerService();
