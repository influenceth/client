# Check if the WAF_CACHE_BUST environment variable is set
if [ -z "$WAF_CACHE_BUST" ]; then
    echo "Environment variable WAF_CACHE_BUST is not set."
else
    echo "Environment variable found, sending POST request..."
    # Use curl to send a POST request to the URL
    curl -X POST "$WAF_CACHE_BUST"
fi